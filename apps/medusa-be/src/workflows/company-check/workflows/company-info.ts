import {
  createWorkflow,
  transform,
  when,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError } from "@medusajs/framework/utils"
import type { CompanyInfo } from "../../../modules/company-check"
import { MAX_COMPANY_RESULTS } from "../helpers/company-info"
import { fetchAresSubjectByIcoStep } from "../steps/company-info/fetch-ares-subject-by-ico"
import { mapCompanyInfoStep } from "../steps/company-info/map-company-info"
import { parseCompanyInfoInputStep } from "../steps/company-info/parse-company-info-input"
import { resolveVatCompanyNameStep } from "../steps/company-info/resolve-vat-company-name"
import { searchAresSubjectsByNameStep } from "../steps/company-info/search-ares-subjects-by-name"
import type { CompanyCheckCzInfoWorkflowInput } from "../helpers/company-info"
import { verifySubjectVatsStep } from "../steps/company-info/verify-subject-vats"

export type { CompanyCheckCzInfoWorkflowInput }

/**
 * Company info orchestration uses explicit stages so each upstream-dependent
 * decision is isolated and testable:
 * 1) normalize and classify input,
 * 2) resolve VAT -> name via VIES when needed,
 * 3) fetch candidates from ARES,
 * 4) verify candidate VAT IDs in VIES,
 * 5) map and finalize response shape.
 */
export const companyCheckCzInfoWorkflow = createWorkflow(
  "company-check-cz-info-workflow",
  (input: CompanyCheckCzInfoWorkflowInput) => {
    const parsedInput = parseCompanyInfoInputStep(input)

    const vatCompanyNameResolution = when(
      "company-check-vat-company-name-branch",
      parsedInput,
      (state) => state.queryType === "vat"
    ).then(() => {
      const vatLookupInput = transform(parsedInput, (state) => {
        if (!state.parsedRequestedVat) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Missing parsed VAT for VAT query"
          )
        }

        return state.parsedRequestedVat
      })

      return resolveVatCompanyNameStep(vatLookupInput)
    })

    const icoSubject = when(
      "company-check-ico-subject-branch",
      parsedInput,
      (state) => state.queryType === "ico"
    ).then(() => {
      const icoLookupInput = transform(parsedInput, (state) => {
        if (!state.companyIdentificationNumber) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Missing company identification number for ICO query"
          )
        }

        return {
          companyIdentificationNumber: state.companyIdentificationNumber,
        }
      })

      return fetchAresSubjectByIcoStep(icoLookupInput)
    })

    const nameSubjects = when(
      "company-check-name-subjects-branch",
      { parsedInput, vatCompanyNameResolution },
      (state) =>
        (state.parsedInput.queryType === "name" &&
          Boolean(state.parsedInput.companyName?.trim())) ||
        (state.parsedInput.queryType === "vat" &&
          Boolean(state.vatCompanyNameResolution?.companyName?.trim()))
    ).then(() => {
      const searchInput = transform(
        { parsedInput, vatCompanyNameResolution },
        (state) => {
          const companyName =
            state.parsedInput.queryType === "name"
              ? state.parsedInput.companyName
              : state.vatCompanyNameResolution?.companyName
          const trimmedCompanyName = companyName?.trim()

          if (!trimmedCompanyName) {
            throw new MedusaError(
              MedusaError.Types.INVALID_DATA,
              "Missing company name for ARES name query"
            )
          }

          return {
            companyName: trimmedCompanyName,
          }
        }
      )

      return searchAresSubjectsByNameStep(searchInput)
    })

    const subjects = transform(
      {
        parsedInput,
        icoSubject,
        nameSubjects,
      },
      (state) => {
        if (state.parsedInput.queryType === "ico") {
          return state.icoSubject ? [state.icoSubject] : []
        }

        return state.nameSubjects ?? []
      }
    )

    const verifiedVatByIco = verifySubjectVatsStep(subjects)

    const companyInfoList = mapCompanyInfoStep({
      subjects,
      verifiedVatByIco,
    })

    const filteredCompanyInfoList = transform(
      {
        parsedInput,
        companyInfoList,
        vatCompanyNameResolution,
      },
      (state) => {
        const { companyInfoList } = state

        if (
          state.parsedInput.queryType !== "vat" ||
          !state.parsedInput.requestedVatIdentificationNumber
        ) {
          return companyInfoList.slice(0, MAX_COMPANY_RESULTS)
        }

        const normalizedRequestedVat =
          state.parsedInput.requestedVatIdentificationNumber.toUpperCase()

        const vatMatchedCompanyInfoList = companyInfoList.filter(
          (companyInfo) =>
            companyInfo.vat_identification_number?.toUpperCase() ===
            normalizedRequestedVat
        )

        if (
          vatMatchedCompanyInfoList.length === 0 &&
          state.vatCompanyNameResolution?.isVatValid &&
          state.vatCompanyNameResolution.isGroupRegistration
        ) {
          // VIES marks this VAT as valid for a taxpayer group, so identity fields
          // cannot be deterministically resolved to one company/address.
          return [
            {
              company_name: "",
              company_identification_number: "",
              vat_identification_number: normalizedRequestedVat,
              street: "",
              city: "",
              country_code: "",
              country: "",
              postal_code: "",
            },
          ]
        }

        return (vatMatchedCompanyInfoList.length > 0
          ? vatMatchedCompanyInfoList
          : companyInfoList
        ).slice(0, MAX_COMPANY_RESULTS)
      }
    )

    return new WorkflowResponse<CompanyInfo[]>(filteredCompanyInfoList)
  }
)
