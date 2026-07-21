import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { syncStorefrontTextsStep } from "../steps/sync-storefront-texts"
import type { SyncStorefrontTextsWorkflowInput } from "../types"
import {
  STOREFRONT_TEXT_LOCK_KEY,
  STOREFRONT_TEXT_LOCK_TIMEOUT_SECONDS,
  STOREFRONT_TEXT_LOCK_TTL_SECONDS,
} from "../lock"

export const syncStorefrontTextsWorkflow = createWorkflow(
  "sync-storefront-texts",
  function (input: SyncStorefrontTextsWorkflowInput) {
    acquireLockStep({
      executeOnSubWorkflow: true,
      key: STOREFRONT_TEXT_LOCK_KEY,
      timeout: STOREFRONT_TEXT_LOCK_TIMEOUT_SECONDS,
      ttl: STOREFRONT_TEXT_LOCK_TTL_SECONDS,
    })

    const result = syncStorefrontTextsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: STOREFRONT_TEXT_LOCK_KEY,
    })

    return new WorkflowResponse(result)
  }
)
