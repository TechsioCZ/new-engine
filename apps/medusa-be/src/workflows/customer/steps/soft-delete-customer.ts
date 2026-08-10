import type { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

interface SoftDeleteCustomerInput {
  customer_id: string
}

export const softDeleteCustomerStep = createStep(
  "soft-delete-customer",
  async (
    input: SoftDeleteCustomerInput,
    { container },
  ): Promise<StepResponse<{ customer_id: string }, string[]>> => {
    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    await customerModuleService.softDeleteCustomers([input.customer_id])

    return new StepResponse(
      {
        customer_id: input.customer_id,
      },
      [input.customer_id],
    )
  },
  async (customerIds, { container }) => {
    if (customerIds === undefined || customerIds.length === 0) {
      return
    }

    const customerModuleService = container.resolve<ICustomerModuleService>(
      Modules.CUSTOMER,
    )

    await customerModuleService.restoreCustomers(customerIds)
  },
)
