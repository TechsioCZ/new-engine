import type {
  IAuthModuleService,
  ICustomerModuleService,
  Query,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { hasArrayData } from "../../../utils/guards"
import { normalizeReactivatedCustomerFirstName } from "../normalizers"

type ReactivateCustomerAccountInput = {
  auth_identity_id: string
  email: string
  first_name?: string | null
  last_name?: string | null
}

type CustomerRecord = {
  deleted_at?: Date | string | null
  email?: string | null
  first_name?: string | null
  id: string
  last_name?: string | null
}

type CustomerUpdate = Parameters<
  ICustomerModuleService["updateCustomers"]
>[1] & {
  has_account?: boolean
}

export const reactivateCustomerAccountStep = createStep(
  "reactivate-customer-account",
  async (
    input: ReactivateCustomerAccountInput,
    { container }
  ): Promise<StepResponse<{ customer_id: string; reactivated: true }>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    const customerResult: unknown = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name", "deleted_at"],
      filters: { email: input.email },
      withDeleted: true,
    })

    if (!hasArrayData<CustomerRecord>(customerResult)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Unexpected response shape while loading customer account."
      )
    }

    const customer = customerResult.data.find((record) => record.deleted_at)

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Deactivated customer account was not found."
      )
    }

    await customerModuleService.restoreCustomers([customer.id])

    const update: CustomerUpdate = {
      first_name: normalizeReactivatedCustomerFirstName(
        input.first_name ?? customer.first_name
      ),
      has_account: true,
      last_name: input.last_name ?? customer.last_name ?? null,
    }

    await customerModuleService.updateCustomers(customer.id, update)
    await authModuleService.updateAuthIdentities({
      id: input.auth_identity_id,
      app_metadata: {
        customer_id: customer.id,
      },
    })

    return new StepResponse({
      customer_id: customer.id,
      reactivated: true,
    })
  }
)
