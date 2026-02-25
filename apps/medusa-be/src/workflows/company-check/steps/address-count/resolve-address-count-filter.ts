import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  COMPANY_CHECK_MODULE,
  type CompanyCheckModuleService,
} from "../../../../modules/company-check"
import {
  buildAresStandardizationPayload,
  buildSidloFilterFromStandardizedAddress,
  type AddressCountWorkflowState,
} from "../../helpers/address-count"
import { isMedusaInvalidDataError } from "../../../../utils/errors"
import { hashValueForLogs, logAddressCountDebug } from "../../helpers/debug"

/**
 * Attempts ARES address standardization first to build code-based `sidlo`
 * filters (more stable and precise than free text). If standardization cannot
 * be used, falls back to `textovaAdresa` to preserve endpoint availability.
 */
export const resolveAddressCountFilterStep = createStep(
  "company-check-resolve-address-count-filter-step",
  async (
    state: AddressCountWorkflowState,
    { container }
  ): Promise<StepResponse<AddressCountWorkflowState>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const companyCheckService =
      container.resolve<CompanyCheckModuleService>(COMPANY_CHECK_MODULE)
    const textAddressHash = hashValueForLogs(state.textAddress)

    logAddressCountDebug(logger, "step_resolve_address_count_filter_start", {
      text_address_hash: textAddressHash,
    })

    try {
      const response = await companyCheckService.searchAresStandardizedAddresses(
        buildAresStandardizationPayload({
          street: state.street,
          city: state.city,
        })
      )
      const standardizedAddressesCount =
        response.standardizovaneAdresy?.length ?? 0
      const standardizedAddress = response.standardizovaneAdresy?.[0]
      const sidloFilter =
        buildSidloFilterFromStandardizedAddress(standardizedAddress) ?? {
          textovaAdresa: state.textAddress,
        }
      const sidloFilterKeysCount = Object.keys(sidloFilter).length
      const usesTextAddressFallback = "textovaAdresa" in sidloFilter

      logAddressCountDebug(logger, "step_resolve_address_count_filter_success", {
        text_address_hash: textAddressHash,
        standardized_addresses_count: standardizedAddressesCount,
        sidlo_filter_keys_count: sidloFilterKeysCount,
        uses_text_address_fallback: usesTextAddressFallback,
      })

      return new StepResponse({
        ...state,
        sidloFilter,
      })
    } catch (error) {
      if (!isMedusaInvalidDataError(error)) {
        throw error
      }

      logAddressCountDebug(logger, "step_resolve_address_count_filter_fallback", {
        text_address_hash: textAddressHash,
        reason: "invalid_data",
      })

      return new StepResponse({
        ...state,
        sidloFilter: { textovaAdresa: state.textAddress },
      })
    }
  }
)
