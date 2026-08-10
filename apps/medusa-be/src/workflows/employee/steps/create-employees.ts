import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { z } from "@medusajs/framework/zod"

import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleCreateEmployee,
  QueryGraphEmployee,
} from "../../../types"

const queryGraphDateSchema = z.union([z.date(), z.string()])
const queryGraphCustomerSchema = z.looseObject({
  email: z.string().nullable(),
  first_name: z.string().nullable().optional(),
  id: z.string(),
  last_name: z.string().nullable().optional(),
})
const queryGraphEmployeeSchema = z.looseObject({
  company_id: z.string(),
  created_at: queryGraphDateSchema,
  customer: queryGraphCustomerSchema.nullable().optional(),
  deleted_at: queryGraphDateSchema.nullable().optional(),
  id: z.string(),
  is_admin: z.boolean(),
  spending_limit: z.number(),
  updated_at: queryGraphDateSchema,
})
const employeeGraphResultSchema = z.object({ data: z.array(z.unknown()) })

const getGraphData = (result: unknown): unknown[] => {
  const parsed = employeeGraphResultSchema.safeParse(result)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Created employee query returned invalid data",
    )
  }
  return parsed.data.data
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

    const parsedEmployee = queryGraphEmployeeSchema.safeParse(employee)
    if (!parsedEmployee.success) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Created employee "${createdEmployee.id}" query returned an invalid record`,
      )
    }

    return new StepResponse(parsedEmployee.data, parsedEmployee.data.id)
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
