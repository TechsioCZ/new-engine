import type { MetadataType, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import {
  CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY,
  withoutCustomerAccountDeactivationNonce,
} from "../../../utils/customer-account-deactivation"
import type { CustomerRecord } from "./prepare-customer-account-reactivation"

interface PrepareCustomerAccountDeactivationInput {
  customer_id: string
  deactivation_nonce: string
}

interface PrepareCustomerAccountDeactivationOutput {
  customer_id: string
  first_name?: string | null | undefined
  metadata: MetadataType
  previous_metadata: MetadataType
}

export const prepareCustomerAccountDeactivationStep = createStep(
  "prepare-customer-account-deactivation",
  async (
    input: PrepareCustomerAccountDeactivationInput,
    { container },
  ): Promise<StepResponse<PrepareCustomerAccountDeactivationOutput>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const customerResult: { data: CustomerRecord[] } = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "first_name",
        "has_account",
        "metadata",
        "deleted_at",
      ],
      filters: { id: input.customer_id },
      withDeleted: true,
    })

    const [customer] = customerResult.data

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Customer account was not found.",
      )
    }

    const wasSoftDeleted =
      customer.deleted_at instanceof Date ||
      (typeof customer.deleted_at === "string" &&
        customer.deleted_at.length > 0)

    if (wasSoftDeleted || customer.has_account === false) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Customer account is already deactivated.",
      )
    }

    if (
      customer.metadata?.[CUSTOMER_ACCOUNT_DEACTIVATION_NONCE_METADATA_KEY] !==
      input.deactivation_nonce
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Account deactivation link is invalid or expired.",
      )
    }

    return new StepResponse({
      customer_id: customer.id,
      first_name: customer.first_name,
      metadata: withoutCustomerAccountDeactivationNonce(customer.metadata),
      previous_metadata: customer.metadata ?? null,
    })
  },
)
