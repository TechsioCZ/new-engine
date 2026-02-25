import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  COMPANY_CHECK_MODULE,
  type CompanyCheckModuleService,
} from "../../../../modules/company-check"
import type { ViesCheckVatRequest } from "../../../../modules/company-check/types"
import { isViesGroupRegistrationName } from "../../../../modules/company-check/utils"
import { hashValueForLogs, logCompanyInfoDebug } from "../../helpers/debug"

export type ResolveVatCompanyNameStepResult = {
  companyName: string | null
  isVatValid: boolean
  isGroupRegistration: boolean
}

/**
 * Resolves company name in VIES for VAT-origin lookup.
 * Returns VAT validity plus a resolvable company name when available.
 */
export const resolveVatCompanyNameStep = createStep(
  "company-check-resolve-vat-company-name-step",
  async (
    vatIdentificationNumber: ViesCheckVatRequest,
    { container }
  ): Promise<StepResponse<ResolveVatCompanyNameStepResult>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const companyCheckService =
      container.resolve<CompanyCheckModuleService>(COMPANY_CHECK_MODULE)
    const vatHash = hashValueForLogs(
      `${vatIdentificationNumber.countryCode}${vatIdentificationNumber.vatNumber}`
    )

    logCompanyInfoDebug(logger, "step_resolve_vat_company_name_start", {
      vat_hash: vatHash,
    })

    const viesResult =
      await companyCheckService.checkVatNumber(vatIdentificationNumber)
    const isGroupRegistration =
      viesResult.valid && isViesGroupRegistrationName(viesResult.name)
    const companyName =
      viesResult.valid && !isGroupRegistration && viesResult.name?.trim()
        ? viesResult.name.trim()
        : null

    if (!companyName) {
      logCompanyInfoDebug(logger, "step_resolve_vat_company_name_empty", {
        vat_hash: vatHash,
        valid: viesResult.valid,
        has_name: Boolean(viesResult.name?.trim()),
        is_group_registration: isGroupRegistration,
      })

      return new StepResponse({
        companyName: null,
        isVatValid: viesResult.valid,
        isGroupRegistration,
      })
    }

    logCompanyInfoDebug(logger, "step_resolve_vat_company_name_success", {
      vat_hash: vatHash,
      is_group_registration: isGroupRegistration,
    })

    return new StepResponse({
      companyName,
      isVatValid: viesResult.valid,
      isGroupRegistration,
    })
  }
)
