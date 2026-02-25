import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { fetchAddressCountStep } from "../steps/address-count/fetch-address-count"
import { parseAddressCountInputStep } from "../steps/address-count/parse-address-count-input"
import { resolveAddressCountFilterStep } from "../steps/address-count/resolve-address-count-filter"
import type {
  CompanyCheckCzAddressCountWorkflowInput,
} from "../helpers/address-count"

export type { CompanyCheckCzAddressCountWorkflowInput }

/**
 * Address count keeps standardization and counting separate:
 * 1) normalize input and derive text address,
 * 2) try standardized ARES address codes for better precision,
 * 3) fall back to text filter if standardization cannot be used,
 * 4) execute a single final count query.
 */
export const companyCheckCzAddressCountWorkflow = createWorkflow(
  "company-check-cz-address-count-workflow",
  (input: CompanyCheckCzAddressCountWorkflowInput) => {
    const parsedInput = parseAddressCountInputStep(input)

    const resolvedFilter = resolveAddressCountFilterStep(parsedInput)

    const result = fetchAddressCountStep(resolvedFilter)

    return new WorkflowResponse(result)
  }
)
