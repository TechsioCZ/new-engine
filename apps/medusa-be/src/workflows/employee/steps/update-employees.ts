import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleUpdateEmployee,
  QueryEmployee,
} from "../../../types"

type UpdateEmployeeCompensation = Pick<
  ModuleUpdateEmployee,
  "id" | "is_admin" | "spending_limit"
>

export const updateEmployeesStep = createStep(
  "update-employees",
  async (
    input: ModuleUpdateEmployee,
    { container }
  ): Promise<StepResponse<QueryEmployee, UpdateEmployeeCompensation>> => {
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { company_id: companyId, ...updatePayload } = input
    const filters = {
      id: input.id,
      ...(companyId ? { company_id: companyId } : {}),
    }

    const {
      data: [currentData],
    } = await query.graph(
      {
        entity: "employee",
        fields: ["*"],
        filters,
      },
      { throwIfKeyNotFound: true }
    )

    if (!currentData) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Employee was not found for the requested company."
      )
    }

    const updatedEmployee =
      await companyModuleService.updateEmployees(updatePayload)

    const {
      data: [employee],
    } = await query.graph(
      {
        entity: "employee",
        fields: ["*", "customer.*", "company.*"],
        filters: {
          ...filters,
          id: updatedEmployee.id,
        },
      },
      { throwIfKeyNotFound: true }
    )

    if (!employee) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Updated employee "${updatedEmployee.id}" was not found`
      )
    }

    return new StepResponse(employee, {
      id: currentData.id,
      is_admin: currentData.is_admin,
      spending_limit: currentData.spending_limit,
    })
  },
  async (
    currentData: UpdateEmployeeCompensation | undefined,
    { container }
  ) => {
    if (!currentData) {
      return
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModuleService.updateEmployees(currentData)
  }
)
