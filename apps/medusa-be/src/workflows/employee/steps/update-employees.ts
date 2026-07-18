import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleEmployee,
  ModuleUpdateEmployee,
} from "../../../types"

export const updateEmployeesStep = createStep(
  "update-employees",
  async (
    input: ModuleUpdateEmployee,
    { container }
  ): Promise<StepResponse<ModuleEmployee, ModuleUpdateEmployee>> => {
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

    return new StepResponse(updatedEmployee, {
      id: currentData.id,
      ...(typeof currentData["is_admin"] === "boolean"
        ? { is_admin: currentData["is_admin"] }
        : {}),
      ...(typeof currentData["spending_limit"] === "number"
        ? { spending_limit: currentData["spending_limit"] }
        : {}),
    })
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
