import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { isRecord } from "@techsio/std/object"

import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleCreateEmployee,
  QueryGraphEmployee,
} from "../../../types"

const isQueryGraphDate = (value: unknown): value is Date | string =>
  value instanceof Date || typeof value === "string"

const isOptionalString = (value: unknown): boolean =>
  value === undefined || value === null || typeof value === "string"

const isQueryGraphCustomer = (
  value: unknown,
): value is NonNullable<QueryGraphEmployee["customer"]> => {
  if (!isRecord(value)) {
    return false
  }
  return [
    typeof value["id"] === "string",
    value["email"] === null || typeof value["email"] === "string",
    isOptionalString(value["first_name"]),
    isOptionalString(value["last_name"]),
  ].every(Boolean)
}

const isQueryGraphEmployee = (value: unknown): value is QueryGraphEmployee => {
  if (!isRecord(value)) {
    return false
  }
  const { customer } = value
  const deletedAt = value["deleted_at"]
  return [
    typeof value["id"] === "string",
    typeof value["spending_limit"] === "number",
    typeof value["is_admin"] === "boolean",
    typeof value["company_id"] === "string",
    isQueryGraphDate(value["created_at"]),
    isQueryGraphDate(value["updated_at"]),
    deletedAt === undefined ||
      deletedAt === null ||
      isQueryGraphDate(deletedAt),
    customer === undefined ||
      customer === null ||
      isQueryGraphCustomer(customer),
  ].every(Boolean)
}

const getGraphData = (result: unknown): unknown[] => {
  if (!isRecord(result) || !Array.isArray(result["data"])) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Created employee query returned invalid data",
    )
  }
  return result["data"]
}

export const createEmployeesStep = createStep(
  "create-employees",
  async (
    input: ModuleCreateEmployee,
    { container },
  ): Promise<StepResponse<QueryGraphEmployee, string>> => {
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const createdEmployee = await companyModuleService.createEmployees(input)

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const employeeResult: unknown = await query.graph(
      {
        entity: "employee",
        fields: ["*", "customer.*"],
        filters: { id: createdEmployee.id },
      },
      { throwIfKeyNotFound: true },
    )
    const [employee] = getGraphData(employeeResult)

    if (employee === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Created employee "${createdEmployee.id}" was not found`,
      )
    }

    if (!isQueryGraphEmployee(employee)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Created employee "${createdEmployee.id}" query returned an invalid record`,
      )
    }

    return new StepResponse(employee, employee.id)
  },
  async (employeeId: string | undefined, { container }) => {
    if (employeeId === undefined || employeeId.length === 0) {
      return
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    await companyModuleService.deleteEmployees([employeeId])
  },
)
