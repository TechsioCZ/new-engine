import type { ICustomerModuleService, Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
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

type PrepareCustomerAccountReactivationCompensation = {
  restored_customer_id?: string
}

export const prepareCustomerAccountReactivationStep = createStep(
  "prepare-customer-account-reactivation",
  async (
    input: ReactivateCustomerAccountInput,
    { container }
  ): Promise<
    StepResponse<
      PrepareCustomerAccountReactivationOutput,
      PrepareCustomerAccountReactivationCompensation
    >
  > => {
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

    if (deactivatedCustomer.deleted_at) {
      await customerModuleService.restoreCustomers([deactivatedCustomer.id])
    }

    return new StepResponse(
      {
        auth_identity_id: input.auth_identity_id,
        customer_id: deactivatedCustomer.id,
        update: buildReactivatedCustomerUpdateInput(
          { ...input, email },
          deactivatedCustomer
        ),
      },
      {
        restored_customer_id: deactivatedCustomer.deleted_at
          ? deactivatedCustomer.id
          : undefined,
      }
    )
  },
  async (input, { container }) => {
    if (!input?.restored_customer_id) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    await customerModuleService.softDeleteCustomers([
      input.restored_customer_id,
    ])
  }
)
