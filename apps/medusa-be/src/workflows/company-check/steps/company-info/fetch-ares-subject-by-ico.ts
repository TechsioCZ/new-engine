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

export type FetchAresSubjectByIcoStepInput = {
  companyIdentificationNumber: string
}

/**
 * Fetches one ARES economic subject by ICO.
 * Not-found responses are mapped to `null` to preserve `[]` behavior upstream.
 */
export const fetchAresSubjectByIcoStep = createStep(
  "company-check-fetch-ares-subject-by-ico-step",
  async (
    input: FetchAresSubjectByIcoStepInput,
    { container }
  ): Promise<StepResponse<AresEconomicSubject | null>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const companyCheckService =
      container.resolve<CompanyCheckModuleService>(COMPANY_CHECK_MODULE)
    const icoHash = hashValueForLogs(input.companyIdentificationNumber)

    logCompanyInfoDebug(logger, "step_fetch_ares_subject_by_ico_start", {
      ico_hash: icoHash,
    })

    try {
      const subject = await companyCheckService.getAresEconomicSubjectByIco(
        input.companyIdentificationNumber
      )

      logCompanyInfoDebug(logger, "step_fetch_ares_subject_by_ico_success", {
        ico_hash: icoHash,
      })

      return new StepResponse(subject)
    } catch (error) {
      if (!isMedusaInvalidData404Error(error)) {
        throw error
      }

      logCompanyInfoDebug(logger, "step_fetch_ares_subject_by_ico_not_found", {
        ico_hash: icoHash,
      })

      return new StepResponse(null)
    }
  }
)
