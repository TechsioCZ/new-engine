import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService, ModuleUpdateCompany } from "../../../types"

export const updateCompaniesStep = createStep(
  "update-companies",
  async (input: ModuleUpdateCompany, { container }) => {
    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const [previousData] = await companyModule.listCompanies({
      id: input.id,
    })

    const updatedCompanies = await companyModule.updateCompanies(input)

    return new StepResponse(updatedCompanies, previousData)
  },
  async (previousData: ModuleUpdateCompany, { container }) => {
    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModule.updateCompanies(previousData)
  }
)
