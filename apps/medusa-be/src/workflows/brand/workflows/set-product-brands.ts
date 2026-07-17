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
import { getProductBrandLockKeys, prepareSetProductBrandsStep } from "../steps"
import type { SetProductBrandsWorkflowInput } from "../types"

export const setProductBrandsWorkflow = createWorkflow(
  {
    name: "set-product-brands-workflow",
    idempotent: false,
  },
  (input: SetProductBrandsWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) =>
      getProductBrandLockKeys([workflowInput.product_id])
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const prepared = prepareSetProductBrandsStep(input)

    dismissRemoteLinkStep(prepared.links_to_dismiss)
    createRemoteLinkStep(prepared.links_to_create)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(prepared.result)
  }
)
