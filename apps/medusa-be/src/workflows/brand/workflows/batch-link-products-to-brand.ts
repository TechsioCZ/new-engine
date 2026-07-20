import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  createRemoteLinkStep,
  dismissRemoteLinkStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
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

    return new WorkflowResponse(prepared.result)
  }
)
