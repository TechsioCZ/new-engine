import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  COMPANY_CHECK_MODULE,
  type CompanyCheckModuleService,
} from "../../../../modules/company-check"
import type { AddressCountWorkflowState } from "../../helpers/address-count"
import { hashValueForLogs, logAddressCountDebug } from "../../helpers/debug"

export type AddressCountWorkflowResult = {
  count: number
}

/**
 * Executes the final ARES count query using the prepared `sidlo` filter.
 * This step is intentionally single-purpose so upstream count behavior remains
 * isolated from input normalization/standardization concerns.
 */
export const fetchAddressCountStep = createStep(
  "company-check-fetch-address-count-step",
  async (
    state: AddressCountWorkflowState,
    { container }
  ): Promise<StepResponse<AddressCountWorkflowResult>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const companyCheckService =
      container.resolve<CompanyCheckModuleService>(COMPANY_CHECK_MODULE)

    const sidloFilter = state.sidloFilter ?? {
      textovaAdresa: state.textAddress,
    }
    const textAddressHash = hashValueForLogs(state.textAddress)

    logAddressCountDebug(logger, "step_fetch_address_count_start", {
      text_address_hash: textAddressHash,
      sidlo_filter_keys_count: Object.keys(sidloFilter).length,
      uses_text_address_fallback: "textovaAdresa" in sidloFilter,
    })

    const response = await companyCheckService.searchAresEconomicSubjects({
      sidlo: sidloFilter,
    })

    logAddressCountDebug(logger, "step_fetch_address_count_success", {
      text_address_hash: textAddressHash,
      count: response.pocetCelkem,
    })

    return new StepResponse({
      count: response.pocetCelkem,
    })
  }
)
