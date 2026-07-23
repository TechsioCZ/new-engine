import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleCreateEmployee,
  QueryEmployee,
} from "../../../types"

export const createEmployeesStep = createStep(
  "create-employees",
  async (
    input: ModuleCreateEmployee,
    { container }
  ): Promise<StepResponse<QueryEmployee, string>> => {
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const createdEmployee = await companyModuleService.createEmployees(input)

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)

    const {
      data: [employee],
    } = await query.graph(
      {
        entity: "employee",
        filters: { id: createdEmployee.id },
        fields: ["id", "company.*"],
      },
      { throwIfKeyNotFound: true }
    )

    if (!employee) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Created employee "${createdEmployee.id}" was not found`
      )
    }

    return new StepResponse(employee, employee.id)
  },
  async (employeeId: string | undefined, { container }) => {
    if (!employeeId) {
      return
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    await companyModuleService.deleteEmployees([employeeId])
  }
)
