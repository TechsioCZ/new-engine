import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

export const restoreCompaniesStep = createStep(
  "restore-companies",
  async (ids: string[], { container }) => {
    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModule.restoreCompanies(ids)

    return new StepResponse(ids, ids)
  },
  async (restoredIds: string[] | undefined, { container }) => {
    if (!restoredIds?.length) {
      return
    }

    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModule.softDeleteCompanies(restoredIds)
  }
)
