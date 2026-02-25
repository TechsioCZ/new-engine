import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  COMPANY_CHECK_MODULE,
  type CompanyCheckModuleService,
} from "../../../../modules/company-check"
import type { AresEconomicSubject } from "../../../../modules/company-check/types"
import { isMedusaInvalidData404Error } from "../../../../utils/errors"
import { hashValueForLogs, logCompanyInfoDebug } from "../../helpers/debug"
import { pickTopCompanyMatchesByName } from "../../helpers/company-info"

export type SearchAresSubjectsByNameStepInput = {
  companyName: string
}

/**
 * Searches ARES subjects by company name and applies deterministic top-match
 * selection for endpoint consistency.
 */
export const searchAresSubjectsByNameStep = createStep(
  "company-check-search-ares-subjects-by-name-step",
  async (
    input: SearchAresSubjectsByNameStepInput,
    { container }
  ): Promise<StepResponse<AresEconomicSubject[]>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const companyCheckService =
      container.resolve<CompanyCheckModuleService>(COMPANY_CHECK_MODULE)
    const companyName = input.companyName.trim()
    const companyNameHash = hashValueForLogs(companyName)

    logCompanyInfoDebug(logger, "step_search_ares_subjects_by_name_start", {
      company_name_hash: companyNameHash,
      company_name_length: companyName.length,
    })

    if (!companyName) {
      logCompanyInfoDebug(logger, "step_search_ares_subjects_by_name_empty", {
        company_name_hash: companyNameHash,
      })

      return new StepResponse([])
    }

    try {
      const response = await companyCheckService.searchAresEconomicSubjects({
        obchodniJmeno: companyName,
      })
      const selectedSubjects = pickTopCompanyMatchesByName(
        companyName,
        response.ekonomickeSubjekty
      )

      logCompanyInfoDebug(logger, "step_search_ares_subjects_by_name_success", {
        company_name_hash: companyNameHash,
        upstream_total_count: response.pocetCelkem,
        selected_count: selectedSubjects.length,
      })

      return new StepResponse(selectedSubjects)
    } catch (error) {
      if (!isMedusaInvalidData404Error(error)) {
        throw error
      }

      logCompanyInfoDebug(logger, "step_search_ares_subjects_by_name_not_found", {
        company_name_hash: companyNameHash,
      })

      return new StepResponse([])
    }
  }
)
