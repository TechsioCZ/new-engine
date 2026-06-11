import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService, ModuleUpdateCompany } from "../../../types"

type UpdateCompaniesStepInput = {
  id: string
  update: Omit<ModuleUpdateCompany, "id">
}

export const updateCompaniesStep = createStep(
  "update-companies",
  async (input: UpdateCompaniesStepInput, { container }) => {
    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const [previousData] = await companyModule.listCompanies({
      id: input.id,
    })
    const updatePayload = {
      ...input.update,
      id: input.id,
    }

    const updatedCompanies = await companyModule.updateCompanies(updatePayload)

    return new StepResponse(updatedCompanies, previousData)
  },
  async (previousData: ModuleUpdateCompany | undefined, { container }) => {
    if (!previousData) {
      return
    }

    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModule.updateCompanies(previousData)
  }
)
