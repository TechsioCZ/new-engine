import type { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { normalizeInactiveCustomerFirstName } from "../normalizers"

interface MarkCustomerAccountInactiveInput {
  customer_id: string
  first_name?: string | null | undefined
  metadata: Record<string, unknown>
  previous_metadata: Record<string, unknown> | null
}

interface MarkCustomerAccountInactiveCompensation {
  customer_id: string
  first_name?: string | null | undefined
  previous_metadata: Record<string, unknown> | null
}

type CustomerUpdateInput = Parameters<
  ICustomerModuleService["updateCustomers"]
>[1] & {
  has_account?: boolean
}

export const markCustomerAccountInactiveStep = createStep(
  "mark-customer-account-inactive",
  async (
    input: MarkCustomerAccountInactiveInput,
    { container },
  ): Promise<
    StepResponse<
      { customer_id: string; first_name: string },
      MarkCustomerAccountInactiveCompensation
    >
  > => {
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )
    const firstName = normalizeInactiveCustomerFirstName(input.first_name)

    const update: CustomerUpdateInput = {
      first_name: firstName,
      has_account: false,
      metadata: input.metadata,
    }

    await customerModuleService.updateCustomers(input.customer_id, update)

    return new StepResponse(
      {
        customer_id: input.customer_id,
        first_name: firstName,
      },
      {
        customer_id: input.customer_id,
        first_name: input.first_name,
        previous_metadata: input.previous_metadata,
      },
    )
  },
  async (input, { container }) => {
    if (!input) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    const update: CustomerUpdateInput = {
      first_name: input.first_name ?? null,
      has_account: true,
      metadata: input.previous_metadata,
    }

    await customerModuleService.updateCustomers(input.customer_id, update)
  },
)
