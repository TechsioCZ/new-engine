import type { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type RestoreCustomerAccountInput = {
  customer_id: string
  was_soft_deleted: boolean
}

export const restoreCustomerAccountStep = createStep(
  "restore-customer-account",
  async (
    input: RestoreCustomerAccountInput,
    { container }
  ): Promise<
    StepResponse<RestoreCustomerAccountInput, RestoreCustomerAccountInput>
  > => {
    if (!input.was_soft_deleted) {
      return new StepResponse(input, input)
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    await customerModuleService.restoreCustomers([input.customer_id])

    return new StepResponse(input, input)
  },
  async (input, { container }) => {
    if (!input?.was_soft_deleted) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER
    )

    await customerModuleService.softDeleteCustomers([input.customer_id])
  }
)
