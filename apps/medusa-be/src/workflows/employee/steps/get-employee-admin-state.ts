import type { Query } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type EmployeeAdminState = {
  id: string
  is_admin: boolean
}

export const getEmployeeAdminStateStep = createStep(
  "get-employee-admin-state",
  async (
    input: { company_id?: string; id: string },
    { container }
  ): Promise<StepResponse<EmployeeAdminState>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const filters = {
      id: input.id,
      ...(input.company_id ? { company_id: input.company_id } : {}),
    }

    const {
      data: [employee],
    } = await query.graph(
      {
        entity: "employee",
        fields: ["id", "is_admin"],
        filters,
      },
      { throwIfKeyNotFound: true }
    )

    if (!employee) {
      throw new Error(`Employee "${input.id}" was not found`)
    }

    return new StepResponse(employee)
  }
)
