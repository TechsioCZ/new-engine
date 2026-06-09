import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

export const validateCompanyActiveStep = createStep(
  "validate-company-active",
  async (companyId: string | undefined, { container }) => {
    if (!companyId) {
      return new StepResponse(undefined)
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    const company = await companyModuleService.retrieveCompany(companyId, {
      select: ["id", "deleted_at"],
      withDeleted: true,
    })

    if (company.deleted_at) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot mutate employees for a deleted company."
      )
    }

    return new StepResponse(company.id)
  }
)
