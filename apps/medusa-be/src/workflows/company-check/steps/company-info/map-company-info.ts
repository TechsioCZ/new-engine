import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { CompanyInfo } from "../../../../modules/company-check"
import {
  composeStreet,
  type MapCompanyInfoStepInput,
} from "../../helpers/company-info"
import { toTrimmedString } from "../../../../utils/strings"
import { logCompanyInfoDebug } from "../../helpers/debug"

function mapSubjectToCompanyInfo(
  subject: MapCompanyInfoStepInput["subjects"][number],
  input: MapCompanyInfoStepInput,
): CompanyInfo {
  return {
    company_name: subject.obchodniJmeno,
    company_identification_number: subject.ico,
    vat_identification_number: input.verifiedVatByIco[subject.ico] ?? null,
    street: composeStreet(subject.sidlo),
    city: toTrimmedString(subject.sidlo?.nazevObce),
    country_code: toTrimmedString(subject.sidlo?.kodStatu),
    country: toTrimmedString(subject.sidlo?.nazevStatu),
    postal_code: toTrimmedString(subject.sidlo?.psc),
  }
}

/**
 * Maps ARES subjects to final `CompanyInfo[]` DTOs.
 * Result filtering and truncation are orchestrated in workflow-level transforms.
 */
export const mapCompanyInfoStep = createStep(
  "company-check-map-company-info-step",
  async (
    input: MapCompanyInfoStepInput,
    { container }
  ): Promise<StepResponse<CompanyInfo[]>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    if (input.subjects.length === 0) {
      logCompanyInfoDebug(logger, "step_map_company_info_empty", {
        subjects_count: 0,
      })

      return new StepResponse([])
    }

    const companyInfoList = input.subjects.map((subject) =>
      mapSubjectToCompanyInfo(subject, input)
    )

    logCompanyInfoDebug(logger, "step_map_company_info_success", {
      subjects_count: input.subjects.length,
      mapped_count: companyInfoList.length,
    })

    return new StepResponse(companyInfoList)
  }
)
