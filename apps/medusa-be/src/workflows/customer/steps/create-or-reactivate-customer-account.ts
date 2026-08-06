import type { ICustomerModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { hasArrayData } from "../../../utils/guards"
import {
  buildReactivatedCustomerUpdateInput,
  normalizeEmail,
  verifyAuthIdentityEmail,
} from "../helpers"
import { isInactiveCustomerFirstName } from "../normalizers"

export type CreateOrReactivateCustomerAccountInput = {
  auth_identity_id: string
  company_name?: string | null
  email: string
  first_name?: string | null
  last_name?: string | null
  metadata?: Record<string, unknown> | null
  phone?: string | null
}

export type CustomerRecord = {
  company_name?: string | null
  deleted_at?: Date | string | null
  email?: string | null
  first_name?: string | null
  has_account?: boolean | null
  id: string
  last_name?: string | null
  metadata?: Record<string, unknown> | null
  phone?: string | null
}

export type ReactivateCustomerAccountUpdateInput = Parameters<
  ICustomerModuleService["updateCustomers"]
>[1] & {
  has_account?: boolean
}

type PrepareCustomerAccountReactivationOutput = {
  auth_identity_id: string
  customer_id: string
  update: ReactivateCustomerAccountUpdateInput
}

export const prepareCustomerAccountReactivationStep = createStep(
  "prepare-customer-account-reactivation",
  async (
    input: CreateOrReactivateCustomerAccountInput,
    { container }
  ): Promise<StepResponse<PrepareCustomerAccountReactivationOutput>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const email = normalizeEmail(input.email)

    await verifyAuthIdentityEmail({
      authIdentityId: input.auth_identity_id,
      email,
      query,
    })

    const customerResult: unknown = await query.graph({
      entity: "customer",
      fields: [
        "id",
        "email",
        "company_name",
        "first_name",
        "last_name",
        "phone",
        "metadata",
        "has_account",
        "deleted_at",
      ],
      filters: { email },
      withDeleted: true,
    })

    if (!hasArrayData<CustomerRecord>(customerResult)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Unexpected response shape while loading customer account."
      )
    }

    const deactivatedCustomer = customerResult.data.find(
      (customer) =>
        customer.deleted_at ||
        customer.has_account === false ||
        isInactiveCustomerFirstName(customer.first_name)
    )

    if (!deactivatedCustomer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Deactivated customer account was not found."
      )
    }

    if (deactivatedCustomer.deleted_at) {
      await customerModuleService.restoreCustomers([deactivatedCustomer.id])
    }

    return new StepResponse({
      auth_identity_id: input.auth_identity_id,
      customer_id: deactivatedCustomer.id,
      update: buildReactivatedCustomerUpdateInput(
        { ...input, email },
        deactivatedCustomer
      ),
    })
  }
)
