import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { assertCustomerOwnsProductListStep } from "../steps/assert-customer-owns-product-list"
import { updateProductListStep } from "../steps/update-product-list"
import type { UpdateProductListWorkflowInput } from "../types"

export const updateProductListWorkflow = createWorkflow(
  "update-product-list-workflow",
  (input: UpdateProductListWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list:${workflowInput.list_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })
    const ownershipInput = transform({ input }, ({ input: workflowInput }) => ({
      customer_id: workflowInput.customer_id,
      list_id: workflowInput.list_id,
    }))

    assertCustomerOwnsProductListStep(ownershipInput)

    const updateInput = transform({ input }, ({ input: workflowInput }) => ({
      data: workflowInput.data,
      list_id: workflowInput.list_id,
    }))
    const list = updateProductListStep(updateInput)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(list)
  }
)
