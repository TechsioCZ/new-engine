import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"

import { isUnknownArray } from "../../../utils/guards"

interface EmployeeAdminState {
  id: string
  is_admin: boolean
}

const getEmployeeAdminState = (
  result: unknown,
  employeeId: string,
): EmployeeAdminState | undefined => {
  const data: unknown = isRecord(result) ? result["data"] : undefined
  if (!isUnknownArray(data)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Employee "${employeeId}" query returned invalid data`,
    )
  }
  const [employee] = data
  let state: EmployeeAdminState | undefined
  if (employee !== undefined) {
    if (
      !isRecord(employee) ||
      typeof employee["id"] !== "string" ||
      typeof employee["is_admin"] !== "boolean"
    ) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Employee "${employeeId}" query returned an invalid record`,
      )
    }
    state = { id: employee["id"], is_admin: employee["is_admin"] }
  }
  return state
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
