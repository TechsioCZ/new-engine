import {
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { updateStorefrontTextStep } from "../steps/update-storefront-text"
import type { UpdateStorefrontTextWorkflowInput } from "../types"
import {
  STOREFRONT_TEXT_LOCK_KEY,
  STOREFRONT_TEXT_LOCK_TIMEOUT_SECONDS,
  STOREFRONT_TEXT_LOCK_TTL_SECONDS,
} from "../lock"

export const updateStorefrontTextWorkflow = createWorkflow(
  "update-storefront-text",
  function (input: UpdateStorefrontTextWorkflowInput) {
    acquireLockStep({
      executeOnSubWorkflow: true,
      key: STOREFRONT_TEXT_LOCK_KEY,
      timeout: STOREFRONT_TEXT_LOCK_TIMEOUT_SECONDS,
      ttl: STOREFRONT_TEXT_LOCK_TTL_SECONDS,
    })

    const result = updateStorefrontTextStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: STOREFRONT_TEXT_LOCK_KEY,
    })

    return new WorkflowResponse(result)
  }
)
