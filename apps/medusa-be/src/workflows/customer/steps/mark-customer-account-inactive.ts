import type { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { normalizeInactiveCustomerFirstName } from "../normalizers"

type MarkCustomerAccountInactiveInput = {
  customer_id: string
  first_name?: string | null
}

type MarkCustomerAccountInactiveCompensation = {
  customer_id: string
  first_name?: string | null
}

export const markCustomerAccountInactiveStep = createStep(
  "mark-customer-account-inactive",
  async (
    input: MarkCustomerAccountInactiveInput,
    { container }
  ): Promise<
    StepResponse<
      { customer_id: string; first_name: string },
      MarkCustomerAccountInactiveCompensation
    >
  > => {
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const firstName = normalizeInactiveCustomerFirstName(input.first_name)

    await customerModuleService.updateCustomers(input.customer_id, {
      first_name: firstName,
    })

    return new StepResponse(
      {
        customer_id: input.customer_id,
        first_name: firstName,
      },
      {
        customer_id: input.customer_id,
        first_name: input.first_name,
      }
    )
  },
  async (input, { container }) => {
    if (!input) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    await customerModuleService.updateCustomers(input.customer_id, {
      first_name: input.first_name ?? null,
    })
  }
)
