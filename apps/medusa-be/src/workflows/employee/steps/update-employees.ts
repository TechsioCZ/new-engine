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

export const updateEmployeesStep = createStep(
  "update-employees",
  async (
    input: ModuleUpdateEmployee,
    { container }
  ): Promise<StepResponse<QueryEmployee, QueryEmployee>> => {
    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const query = container.resolve(ContainerRegistrationKeys.QUERY)
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

    return new StepResponse(
      employee as unknown as QueryEmployee,
      currentData as unknown as QueryEmployee
    )
  },
  async (currentData: ModuleUpdateEmployee | undefined, { container }) => {
    if (!currentData) {
      return
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModuleService.updateEmployees(currentData)
  }
)
