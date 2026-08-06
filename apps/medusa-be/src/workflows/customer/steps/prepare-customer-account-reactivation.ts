import type { CustomerUpdatableFields, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { normalizeEmail } from "../../../utils/email"
import {
  buildReactivatedCustomerUpdateInput,
  verifyAuthIdentityEmail,
} from "../helpers"

export type ReactivateCustomerAccountInput = {
  auth_identity_id: string
  company_name?: string | null
  customer: CustomerRecord
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

export type ReactivateCustomerAccountUpdateInput = CustomerUpdatableFields

type PrepareCustomerAccountReactivationOutput = {
  auth_identity_id: string
  customer: CustomerRecord
  customer_id: string
  update: ReactivateCustomerAccountUpdateInput
  was_soft_deleted: boolean
}

export const prepareCustomerAccountReactivationStep = createStep(
  "prepare-customer-account-reactivation",
  async (
    input: ReactivateCustomerAccountInput,
    { container }
  ): Promise<StepResponse<PrepareCustomerAccountReactivationOutput>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const email = normalizeEmail(input.email)

    await verifyAuthIdentityEmail({
      authIdentityId: input.auth_identity_id,
      email,
      query,
    })

    const deactivatedCustomer = input.customer

    if (
      !(
        deactivatedCustomer.deleted_at ||
        deactivatedCustomer.has_account === false
      )
    ) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Deactivated customer account was not found."
      )
    }

    return new StepResponse({
      auth_identity_id: input.auth_identity_id,
      customer: deactivatedCustomer,
      customer_id: deactivatedCustomer.id,
      update: buildReactivatedCustomerUpdateInput(
        { ...input, email },
        deactivatedCustomer
      ),
      was_soft_deleted: Boolean(deactivatedCustomer.deleted_at),
    })
  }
)
