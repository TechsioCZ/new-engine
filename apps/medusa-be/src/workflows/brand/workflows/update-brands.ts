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
import {
  getBrandAttributeTypeLockKeys,
  getBrandMutationLockKeys,
  updateBrandsStep,
} from "../steps"
import type { UpdateBrandsWorkflowInput } from "../types"

export const updateBrandsWorkflow = createWorkflow(
  "update-brands-workflow",
  (input: UpdateBrandsWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => {
      const attributeNames = (workflowInput.update.attributes ?? []).map(
        ({ name }) => name.trim()
      )

      return [
        ...getBrandMutationLockKeys([workflowInput.selector.id]),
        ...(attributeNames.length
          ? getBrandAttributeTypeLockKeys(attributeNames)
          : []),
      ]
    })

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const result = updateBrandsStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    const eventData = transform({ input }, ({ input: workflowInput }) =>
      buildBrandSearchProjectionEventData({
        brandIds: [workflowInput.selector.id],
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
