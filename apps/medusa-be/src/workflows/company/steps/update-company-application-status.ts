import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type {
  ICompanyModuleService,
  ModuleCompany,
  ModuleCompanyApplicationStatus,
} from "../../../types"

type UpdateCompanyApplicationStatusStepInput = {
  id: string
  status: ModuleCompanyApplicationStatus
}

type UpdateCompanyApplicationStatusCompensation = {
  id: string
  applied_application_changed_at: Date
  previous_application_changed_at: ModuleCompany["application_changed_at"]
  previous_application_status: ModuleCompany["application_status"]
}

export const updateCompanyApplicationStatusStep = createStep(
  "update-company-application-status",
  async (
    input: UpdateCompanyApplicationStatusStepInput,
    { container }
  ): Promise<
    StepResponse<ModuleCompany, UpdateCompanyApplicationStatusCompensation>
  > => {
    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    const [previousData] = await companyModule.listCompanies({
      id: input.id,
    })
    const applicationStatusRevision = new Date()

    if (!previousData) {
      const updatedCompanyWithoutCompensation =
        await companyModule.updateCompanies({
          application_changed_at: applicationStatusRevision,
          application_status: input.status,
          id: input.id,
        })

      return new StepResponse(updatedCompanyWithoutCompensation)
    }

    const [updatedCompany] = await companyModule.updateCompanies({
      data: {
        application_changed_at: applicationStatusRevision,
        application_status: input.status,
      },
      selector: {
        application_changed_at: previousData.application_changed_at,
        id: input.id,
      },
    })

    if (!updatedCompany) {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        "Company application status changed during update"
      )
    }

    return new StepResponse(updatedCompany, {
      id: previousData.id,
      applied_application_changed_at: applicationStatusRevision,
      previous_application_changed_at: previousData.application_changed_at,
      previous_application_status: previousData.application_status,
    })
  },
  async (previousData, { container }) => {
    if (!previousData) {
      return
    }

    const companyModule =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)

    await companyModule.updateCompanies({
      data: {
        application_changed_at: previousData.previous_application_changed_at,
        application_status: previousData.previous_application_status,
      },
      selector: {
        application_changed_at: previousData.applied_application_changed_at,
        id: previousData.id,
      },
    })
  }
)
