import type { Link } from "@medusajs/framework/modules-sdk"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"

export const linkEmployeeToCustomerStep = createStep(
  "link-employee-to-customer",
  async (
    input: { employeeId: string; customerId: string },
    { container }
  ): Promise<
    StepResponse<undefined, { employeeId: string; customerId: string }>
  > => {
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const linkData = {
      [COMPANY_MODULE]: {
        employee_id: input.employeeId,
      },
      [Modules.CUSTOMER]: {
        customer_id: input.customerId,
      },
    }

    await link.create(linkData)

    return new StepResponse(undefined, input)
  },
  async (input, { container }) => {
    if (!input?.employeeId || !input?.customerId) {
      return
    }

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const linkData = {
      [COMPANY_MODULE]: {
        employee_id: input.employeeId,
      },
      [Modules.CUSTOMER]: {
        customer_id: input.customerId,
      },
    }

    await link.dismiss(linkData)
  }
)
