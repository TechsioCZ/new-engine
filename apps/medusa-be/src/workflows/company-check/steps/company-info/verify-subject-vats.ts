import type { Logger } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  COMPANY_CHECK_MODULE,
  type CompanyCheckModuleService,
} from "../../../../modules/company-check"
import type { AresEconomicSubject } from "../../../../modules/company-check/types"
import {
  parseVatIdentificationNumber,
  resolveAresSubjectVatIdentificationNumber,
} from "../../../../modules/company-check/utils"
import { logCompanyInfoDebug } from "../../helpers/debug"

export type VerifySubjectVatsStepResult = Record<string, string | null>
const CHUNK_SIZE = 10

/**
 * Validates candidate VAT IDs from ARES in VIES and stores results by ICO.
 * We deduplicate identical VAT IDs before calling VIES to minimize upstream load.
 * Invalid DIC formats are ignored so one malformed candidate does not fail the
 * entire company-info lookup.
 */
export const verifySubjectVatsStep = createStep(
  "company-check-verify-subject-vats-step",
  async (
    subjects: AresEconomicSubject[],
    { container }
  ): Promise<StepResponse<VerifySubjectVatsStepResult>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

    if (subjects.length === 0) {
      logCompanyInfoDebug(logger, "step_verify_subject_vats_skipped", {
        subjects_count: 0,
      })

      return new StepResponse({})
    }

    const companyCheckService =
      container.resolve<CompanyCheckModuleService>(COMPANY_CHECK_MODULE)

    const parsedVatByIco = new Map<string, { countryCode: string; vatNumber: string }>()
    const uniqueParsedVatByKey = new Map<
      string,
      { countryCode: string; vatNumber: string }
    >()
    let invalidVatFormatCount = 0

    for (const subject of subjects) {
      const rawVatIdentificationNumber =
        resolveAresSubjectVatIdentificationNumber(subject)
      if (!rawVatIdentificationNumber) {
        continue
      }

      try {
        const parsedVat = parseVatIdentificationNumber(rawVatIdentificationNumber)
        const vatKey = `${parsedVat.countryCode}${parsedVat.vatNumber}`
        parsedVatByIco.set(subject.ico, parsedVat)
        uniqueParsedVatByKey.set(vatKey, parsedVat)
      } catch (error) {
        if (
          error instanceof MedusaError &&
          error.type === MedusaError.Types.INVALID_DATA
        ) {
          invalidVatFormatCount++
          continue
        }
        throw error
      }
    }

    logCompanyInfoDebug(logger, "step_verify_subject_vats_collected", {
      subjects_count: subjects.length,
      parsed_vat_count: parsedVatByIco.size,
      unique_vat_count: uniqueParsedVatByKey.size,
      invalid_vat_format_count: invalidVatFormatCount,
    })

    const validationResults: Array<{
      vatKey: string
      verifiedVatIdentificationNumber: string | null
    }> = []
    const vatEntries = Array.from(uniqueParsedVatByKey.entries())

    for (let offset = 0; offset < vatEntries.length; offset += CHUNK_SIZE) {
      const chunk = vatEntries.slice(offset, offset + CHUNK_SIZE)
      const chunkResults = await Promise.all(
        chunk.map(async ([vatKey, parsedVat]) => {
          try {
            const viesResult = await companyCheckService.checkVatNumber(parsedVat)
            return {
              vatKey,
              verifiedVatIdentificationNumber: viesResult.valid ? vatKey : null,
            }
          } catch {
            return {
              vatKey,
              verifiedVatIdentificationNumber: null,
            }
          }
        })
      )
      validationResults.push(...chunkResults)
    }

    const verifiedVatByKey = new Map<string, string | null>()
    for (const result of validationResults) {
      verifiedVatByKey.set(result.vatKey, result.verifiedVatIdentificationNumber)
    }

    const verifiedVatByIco: Record<string, string | null> = {}
    for (const subject of subjects) {
      const parsedVat = parsedVatByIco.get(subject.ico)
      if (!parsedVat) {
        verifiedVatByIco[subject.ico] = null
        continue
      }

      const vatKey = `${parsedVat.countryCode}${parsedVat.vatNumber}`
      verifiedVatByIco[subject.ico] = verifiedVatByKey.get(vatKey) ?? null
    }

    const verifiedVatCount = Object.values(verifiedVatByIco).filter(
      (value) => Boolean(value)
    ).length

    logCompanyInfoDebug(logger, "step_verify_subject_vats_success", {
      subjects_count: subjects.length,
      verified_vat_count: verifiedVatCount,
    })

    return new StepResponse(verifiedVatByIco)
  }
)
