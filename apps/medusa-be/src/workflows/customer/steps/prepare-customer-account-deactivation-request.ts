import type {
  MetadataType,
  ICustomerModuleService,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  buildCustomerAccountDeactivationUrl,
  createCustomerAccountDeactivationNonce,
  createCustomerAccountDeactivationToken,
  CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY,
} from "../../../utils/customer-account-deactivation"
import { normalizeCustomerName } from "../normalizers"
import type { CustomerRecord } from "./prepare-customer-account-reactivation"

interface PrepareCustomerAccountDeactivationRequestInput {
  customer_id: string
}

export interface PrepareCustomerAccountDeactivationRequestOutput {
  confirmation_url: string
  customer_id: string
  customer_name?: string | undefined
  email: string
  sent: true
}

interface PrepareCustomerAccountDeactivationRequestCompensation {
  customer_id: string
  metadata: MetadataType
}

export const prepareCustomerAccountDeactivationRequestStep = createStep(
  "prepare-customer-account-deactivation-request",
  async (
    input: PrepareCustomerAccountDeactivationRequestInput,
    { container },
  ): Promise<
    StepResponse<
      PrepareCustomerAccountDeactivationRequestOutput,
      PrepareCustomerAccountDeactivationRequestCompensation
    >
  > => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const customerResult: { data: CustomerRecord[] } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "first_name",
        "last_name",
        "metadata",
        "deleted_at",
      ],
      filters: { id: input.customer_id },
    })

    const [customer] = customerResult.data

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer account was not found.",
      )
    }

    if (
      customer.deleted_at instanceof Date ||
      (typeof customer.deleted_at === "string" &&
        customer.deleted_at.length > 0)
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Customer account is already deactivated.",
      )
    }

    const email = customer.email?.trim()

    if (email === undefined || email === "") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Customer account has no email address.",
      )
    }

    const deactivationNonce = createCustomerAccountDeactivationNonce()
    const token = createCustomerAccountDeactivationToken({
      customer_id: customer.id,
      deactivation_nonce: deactivationNonce,
      email,
    })
    const confirmationUrl = buildCustomerAccountDeactivationUrl(token)
    const previousMetadata = customer.metadata ?? null
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    await customerModuleService.updateCustomers(customer.id, {
      metadata: {
        ...previousMetadata,
        [CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY]: deactivationNonce,
      },
    })

    return new StepResponse(
      {
        confirmation_url: confirmationUrl,
        customer_id: customer.id,
        customer_name: normalizeCustomerName(customer),
        email,
        sent: true,
      },
      { customer_id: customer.id, metadata: previousMetadata },
    )
  },
  async (compensation, { container }) => {
    if (compensation === undefined) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )
    await customerModuleService.updateCustomers(compensation.customer_id, {
      metadata: compensation.metadata,
    })
  },
)
