import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  createRemoteLinkStep,
  dismissRemoteLinkStep,
  emitEventStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"

import {
  BRAND_SEARCH_PROJECTION_CHANGED,
  BRAND_SEARCH_PROJECTION_EVENT_OPTIONS,
  buildBrandSearchProjectionEventData,
} from "../../meilisearch/events"
import {
  getBrandProductsLockKeys,
  prepareBatchLinkProductsToBrandStep,
} from "../steps"
import type { BatchLinkProductsToBrandWorkflowInput } from "../types"

export const batchLinkProductsToBrandWorkflow = createWorkflow(
  {
    name: "batch-link-products-to-brand",
    idempotent: false,
  },
  (input: BatchLinkProductsToBrandWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandProductsLockKeys(workflowInput.brand_id, [
        ...workflowInput.add,
        ...workflowInput.remove,
      ])
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const prepared = prepareBatchLinkProductsToBrandStep(input)

    dismissRemoteLinkStep(prepared.links_to_dismiss)
    createRemoteLinkStep(prepared.links_to_create)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    const eventData = transform({ result: prepared.result }, ({ result }) =>
      buildBrandSearchProjectionEventData({
        productIds: [...result.added, ...result.removed],
      })
    )

    emitEventStep({
      data: eventData,
      eventName: BRAND_SEARCH_PROJECTION_CHANGED,
      options: BRAND_SEARCH_PROJECTION_EVENT_OPTIONS,
    })

    return new WorkflowResponse(prepared.result)
  }
)
