import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"

import {
  STOREFRONT_TEXT_LOCK_KEY,
  STOREFRONT_TEXT_LOCK_TIMEOUT_SECONDS,
  STOREFRONT_TEXT_LOCK_TTL_SECONDS,
} from "../lock"
import { importStorefrontTextCatalogStep } from "../steps/import-storefront-text-catalog"
import type { ImportStorefrontTextCatalogWorkflowInput } from "../types"

export const importStorefrontTextCatalogWorkflow = createWorkflow(
  "import-storefront-text-catalog",
  (input: ImportStorefrontTextCatalogWorkflowInput) => {
    acquireLockStep({
      executeOnSubWorkflow: true,
      key: STOREFRONT_TEXT_LOCK_KEY,
      timeout: STOREFRONT_TEXT_LOCK_TIMEOUT_SECONDS,
      ttl: STOREFRONT_TEXT_LOCK_TTL_SECONDS,
    })

    const result = importStorefrontTextCatalogStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: STOREFRONT_TEXT_LOCK_KEY,
    })

    return new WorkflowResponse(result)
  },
)
