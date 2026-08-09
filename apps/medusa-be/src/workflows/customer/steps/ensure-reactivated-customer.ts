import type { CustomerDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

export const ensureReactivatedCustomerStep = createStep(
  "ensure-reactivated-customer",
  async (customers: CustomerDTO[]): Promise<StepResponse<CustomerDTO>> => {
    const [customer] = customers

    if (!customer) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Customer account reactivation did not return a customer."
      )
    }

    return new StepResponse(customer)
  }
)
