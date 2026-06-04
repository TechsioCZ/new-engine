import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { assertCustomerOwnsProductListStep } from "../steps/assert-customer-owns-product-list"
import { incrementProductListItemStep } from "../steps/increment-product-list-item"
import { retrieveProductListItemStep } from "../steps/retrieve-product-list-item"
import type { IncrementProductListItemWorkflowInput } from "../types"

export const incrementProductListItemWorkflow = createWorkflow(
  "increment-product-list-item-workflow",
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

    const itemId = transform(
      { input },
      ({ input: workflowInput }) => workflowInput.item_id
    )
    const currentItem = retrieveProductListItemStep(itemId)
    const ownershipInput = transform(
      { currentItem, input },
      ({ currentItem: productListItem, input: workflowInput }) => ({
        customer_id: workflowInput.customer_id,
        list_id: productListItem.list_id,
      })
    )

    assertCustomerOwnsProductListStep(ownershipInput)

    const incrementInput = transform(
      { currentItem, input },
      ({ currentItem: productListItem, input: workflowInput }) => ({
        item_id: workflowInput.item_id,
        list_id: productListItem.list_id,
        previous_quantity: productListItem.quantity,
        quantity: workflowInput.quantity,
      })
    )
    const item = incrementProductListItemStep(incrementInput)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(item)
  }
)
