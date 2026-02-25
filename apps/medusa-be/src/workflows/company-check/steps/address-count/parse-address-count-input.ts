import type { Logger } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import {
  buildTextAddress,
  type AddressCountWorkflowState,
  type CompanyCheckCzAddressCountWorkflowInput,
} from "../../helpers/address-count"
import { hashValueForLogs, logAddressCountDebug } from "../../helpers/debug"
import { requireTrimmedValue } from "../../../../utils/strings"

/**
 * Normalizes required address fields early and derives one canonical text
 * address used by both standardization and fallback paths.
 */
export const parseAddressCountInputStep = createStep(
  "company-check-parse-address-count-input-step",
  async (
    input: CompanyCheckCzAddressCountWorkflowInput,
    { container }
  ): Promise<StepResponse<AddressCountWorkflowState>> => {
    const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
    const street = requireTrimmedValue(input.street, "street")
    const city = requireTrimmedValue(input.city, "city")
    const textAddress = buildTextAddress({
      street,
      city,
    })

    logAddressCountDebug(logger, "step_parse_address_count_input_success", {
      text_address_hash: hashValueForLogs(textAddress),
    })

    return new StepResponse({
      street,
      city,
      textAddress,
      sidloFilter: null,
    })
  }
)
