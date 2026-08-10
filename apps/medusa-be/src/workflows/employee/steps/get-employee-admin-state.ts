import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

const employeeAdminStateResultSchema = z.object({
  data: z.array(z.unknown()),
})
const employeeAdminStateSchema = z.object({
  id: z.string(),
  is_admin: z.boolean(),
})

interface EmployeeAdminState {
  id: string
  is_admin: boolean
}

const getEmployeeAdminState = (
  result: unknown,
  employeeId: string,
): EmployeeAdminState | undefined => {
  const parsedResult = employeeAdminStateResultSchema.safeParse(result)
  if (!parsedResult.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Employee "${employeeId}" query returned invalid data`,
    )
  }
  const [employee] = parsedResult.data.data
  if (employee === undefined) {
    return undefined
  }
  const parsedEmployee = employeeAdminStateSchema.safeParse(employee)
  if (!parsedEmployee.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Employee "${employeeId}" query returned an invalid record`,
    )
  }
  return parsedEmployee.data
}

export const getEmployeeAdminStateStep = createStep(
  "get-employee-admin-state",
  async (
    input: { company_id?: string | undefined; id: string },
    { container },
  ): Promise<StepResponse<EmployeeAdminState>> => {
    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const filters = {
      id: input.id,
      ...(input.company_id !== undefined && input.company_id.length > 0
        ? { company_id: input.company_id }
        : {}),
    }

    const employeeResult: unknown = await query.graph(
      {
        entity: "employee",
        fields: ["id", "is_admin"],
        filters,
      },
      { throwIfKeyNotFound: true },
    )
    const employee = getEmployeeAdminState(employeeResult, input.id)

    if (employee === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Employee "${input.id}" was not found`,
      )
    }

    return new StepResponse(employee)
  },
)
