import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { createProductListItemStep } from "../steps/create-product-list-item"
import type { CreateProductListItemWorkflowInput } from "../types"

export const createProductListItemWorkflow = createWorkflow(
  {
    idempotent: false,
    name: "create-product-list-item-workflow",
  },
  (input: CreateProductListItemWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list-item:${workflowInput.list_id}:${workflowInput.product_id}:${workflowInput.variant_id ?? "product"}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const item = createProductListItemStep(input)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(item)
  }
)
