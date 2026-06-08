import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { assertCustomerOwnsProductListStep } from "../steps/assert-customer-owns-product-list"
import { retrieveProductListItemStep } from "../steps/retrieve-product-list-item"
import { updateProductListItemStep } from "../steps/update-product-list-item"
import type { UpdateProductListItemWorkflowInput } from "../types"

export const updateProductListItemWorkflow = createWorkflow(
  "update-product-list-item-workflow",
  (input: UpdateProductListItemWorkflowInput) => {
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

    const updateInput = transform(
      { currentItem, input },
      ({ currentItem: productListItem, input: workflowInput }) => ({
        data: workflowInput.data,
        item_id: workflowInput.item_id,
        list_id: productListItem.list_id,
        previous_item: productListItem,
      })
    )
    const item = updateProductListItemStep(updateInput)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(item)
  }
)
