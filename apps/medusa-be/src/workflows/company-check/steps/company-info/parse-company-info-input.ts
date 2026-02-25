import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { parseVatIdentificationNumber } from "../../../../modules/company-check/utils"
import { logCompanyInfoDebug } from "../../helpers/debug"
import type {
  CompanyCheckCzInfoWorkflowInput,
  ParsedCompanyInfoWorkflowInput,
} from "../../helpers/company-info"

/**
 * Normalizes and classifies input into a single query mode (`vat`, `ico`, `name`).
 * Downstream steps consume one canonical state object instead of repeating
 * mutually-exclusive input checks.
 */
export const parseCompanyInfoInputStep = createStep(
  "company-check-parse-company-info-input-step",
  async (
    input: CompanyCheckCzInfoWorkflowInput,
    { container }
  ): Promise<StepResponse<ParsedCompanyInfoWorkflowInput>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const vatIdentificationNumber = input.vat_identification_number?.trim()
    const companyIdentificationNumber =
      input.company_identification_number?.trim()
    const companyName = input.company_name?.trim()

    const provided = [
      vatIdentificationNumber,
      companyIdentificationNumber,
      companyName,
    ].filter((value) => Boolean(value))

    if (provided.length !== 1) {
      logCompanyInfoDebug(logger, "step_parse_input_invalid", {
        provided_fields_count: provided.length,
      })

      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Exactly one of vat_identification_number, company_identification_number, or company_name is required"
      )
    }

    if (vatIdentificationNumber) {
      const parsedVat = parseVatIdentificationNumber(vatIdentificationNumber)
      logCompanyInfoDebug(logger, "step_parse_input_classified", {
        query_type: "vat",
      })

      return new StepResponse({
        queryType: "vat",
        requestedVatIdentificationNumber: `${parsedVat.countryCode}${parsedVat.vatNumber}`,
        parsedRequestedVat: parsedVat,
        companyIdentificationNumber: null,
        companyName: null,
      })
    }

    if (companyIdentificationNumber) {
      logCompanyInfoDebug(logger, "step_parse_input_classified", {
        query_type: "ico",
      })

      return new StepResponse({
        queryType: "ico",
        requestedVatIdentificationNumber: null,
        parsedRequestedVat: null,
        companyIdentificationNumber,
        companyName: null,
      })
    }

    if (companyName) {
      logCompanyInfoDebug(logger, "step_parse_input_classified", {
        query_type: "name",
      })

      return new StepResponse({
        queryType: "name",
        requestedVatIdentificationNumber: null,
        parsedRequestedVat: null,
        companyIdentificationNumber: null,
        companyName,
      })
    }

    /* istanbul ignore next */
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Exactly one of vat_identification_number, company_identification_number, or company_name is required"
    )
  }
)
