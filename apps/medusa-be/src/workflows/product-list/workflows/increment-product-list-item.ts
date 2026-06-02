import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { incrementProductListItemStep } from "../steps/increment-product-list-item"
import type { IncrementProductListItemWorkflowInput } from "../types"

export const incrementProductListItemWorkflow = createWorkflow(
  {
    idempotent: false,
    name: "increment-product-list-item-workflow",
  },
  (input: IncrementProductListItemWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list-item:${workflowInput.item_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const item = incrementProductListItemStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(item)
  }
)
