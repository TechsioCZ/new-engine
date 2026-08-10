import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { omitUndefined } from "@techsio/std/object"

import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleUpdateEmployee,
  QueryGraphEmployee,
} from "../../../types"

type UpdateEmployeeCompensation = Pick<
  ModuleUpdateEmployee,
  "id" | "is_admin" | "spending_limit"
>

export const updateEmployeesStep = createStep(
  "update-employees",
  async (
    input: ModuleUpdateEmployee,
    { container },
  ): Promise<StepResponse<QueryGraphEmployee, UpdateEmployeeCompensation>> => {
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const query = container.resolve<Query>(ContainerRegistrationKeys.QUERY)
    const { company_id: companyId, ...updatePayload } = input
    const filters = {
      id: input.id,
      ...(companyId === undefined || companyId === ""
        ? {}
        : { company_id: companyId }),
    }

    const currentDataResult: { data: QueryGraphEmployee[] } = await query.graph(
      {
        entity: "employee",
        fields: ["*"],
        filters,
      },
      { throwIfKeyNotFound: true },
    )
    const [currentData] = currentDataResult.data

    if (currentData === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "Employee was not found for the requested company.",
      )
    }

    const updatedEmployee =
      await companyModuleService.updateEmployees(updatePayload)

    const employeeResult: { data: QueryGraphEmployee[] } = await query.graph(
      {
        entity: "employee",
        fields: ["*", "customer.*", "company.*"],
        filters: {
          ...filters,
          id: updatedEmployee.id,
        },
      },
      { throwIfKeyNotFound: true },
    )
    const [employee] = employeeResult.data

    if (employee === undefined) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Updated employee "${updatedEmployee.id}" was not found`,
      )
    }

    return new StepResponse(
      employee,
      omitUndefined({
        id: currentData.id,
        is_admin: currentData.is_admin,
        spending_limit: currentData.spending_limit,
      }),
    )
  },
  async (
    currentData: UpdateEmployeeCompensation | undefined,
    { container },
  ) => {
    if (currentData === undefined) {
      return
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModuleService.updateEmployees(currentData)
  },
)
