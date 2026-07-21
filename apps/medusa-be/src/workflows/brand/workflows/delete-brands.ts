import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  emitEventStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import {
  BRAND_SEARCH_PROJECTION_CHANGED,
  BRAND_SEARCH_PROJECTION_EVENT_OPTIONS,
  buildBrandSearchProjectionEventData,
} from "../../meilisearch/events"
import { deleteBrandsStep, getBrandLifecycleLockKeys } from "../steps"
import type { DeleteBrandsWorkflowInput } from "../types"

export const deleteBrandsWorkflow = createWorkflow(
  "delete-brands-workflow",
  (input: DeleteBrandsWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getBrandLifecycleLockKeys(workflowInput.ids)
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = deleteBrandsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    const eventData = transform({ input }, ({ input: workflowInput }) =>
      buildBrandSearchProjectionEventData({
        brandIds: workflowInput.ids,
      })
    )

    emitEventStep({
      data: eventData,
      eventName: BRAND_SEARCH_PROJECTION_CHANGED,
      options: BRAND_SEARCH_PROJECTION_EVENT_OPTIONS,
    })

    return new WorkflowResponse(result)
  }
)
