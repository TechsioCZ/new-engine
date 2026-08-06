import type { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type MarkCustomerAccountActiveInput = {
  customer_id: string
}

type CustomerAccountUpdateInput = Parameters<
  ICustomerModuleService["updateCustomers"]
>[1] & {
  has_account?: boolean
}

export const markCustomerAccountActiveStep = createStep(
  "mark-customer-account-active",
  async (
    input: MarkCustomerAccountActiveInput,
    { container }
  ): Promise<
    StepResponse<MarkCustomerAccountActiveInput, MarkCustomerAccountActiveInput>
  > => {
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const update: CustomerAccountUpdateInput = {
      has_account: true,
    }

    await customerModuleService.updateCustomers(input.customer_id, update)

    return new StepResponse(input, input)
  },
  async (input, { container }) => {
    if (!input) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )
    const update: CustomerAccountUpdateInput = {
      has_account: false,
    }

    await customerModuleService.updateCustomers(input.customer_id, update)
  }
)
