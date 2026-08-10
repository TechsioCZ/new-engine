import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleCompanyApplicationStatus,
  ModuleUpdateCompany,
} from "../../../types"

type UpdateCompanyApplicationStatusStepInput = {
  id: string
  status: ModuleCompanyApplicationStatus
}

export const updateCompanyApplicationStatusStep = createStep(
  "update-company-application-status",
  async (input: UpdateCompanyApplicationStatusStepInput, { container }) => {
    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const [previousData] = await companyModule.listCompanies({
      id: input.id,
    })

    const updatedCompany = await companyModule.updateCompanies({
      application_changed_at: new Date(),
      application_status: input.status,
      id: input.id,
    })

    return new StepResponse(updatedCompany, previousData)
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
