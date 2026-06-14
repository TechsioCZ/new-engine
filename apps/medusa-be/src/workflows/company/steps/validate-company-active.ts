import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

export const validateCompanyActiveStep = createStep(
  "validate-company-active",
  async (companyId: string | string[] | undefined, { container }) => {
    if (!companyId || (Array.isArray(companyId) && !companyId.length)) {
      return new StepResponse(undefined)
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    const companyIds = Array.isArray(companyId) ? companyId : [companyId]
    const companies = Array.isArray(companyId)
      ? await companyModuleService.listCompanies(
          { id: companyIds },
          {
            select: ["id", "deleted_at"],
            withDeleted: true,
          }
        )
      : [
          await companyModuleService.retrieveCompany(companyId, {
            select: ["id", "deleted_at"],
            withDeleted: true,
          }),
        ]
    const deletedCompany = companies.find((company) => company.deleted_at)

    if (deletedCompany) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot mutate a deleted company."
      )
    }

    return new StepResponse(companyIds)
  }
)
