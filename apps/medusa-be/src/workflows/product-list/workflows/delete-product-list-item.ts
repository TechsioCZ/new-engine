import type { DeleteEntityInput } from "@medusajs/framework/modules-sdk"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  releaseLockStep,
  removeRemoteLinkStep,
} from "@medusajs/medusa/core-flows"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import { assertCustomerOwnsProductListStep } from "../steps/assert-customer-owns-product-list"
import { assertProductListItemBelongsToListStep } from "../steps/assert-product-list-item-belongs-to-list"
import { deleteProductListItemStep } from "../steps/delete-product-list-item"
import { retrieveProductListItemStep } from "../steps/retrieve-product-list-item"
import type { DeleteProductListItemWorkflowInput } from "../types"

export const deleteProductListItemWorkflow = createWorkflow(
  "delete-product-list-item-workflow",
  (input: DeleteProductListItemWorkflowInput) => {
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
    const expectedListInput = transform(
      { currentItem, input },
      ({ currentItem: productListItem, input: workflowInput }) => ({
        expected_list_id: workflowInput.expected_list_id,
        item: productListItem,
      })
    )

    assertProductListItemBelongsToListStep(expectedListInput)

    const ownershipInput = transform(
      { currentItem, input },
      ({ currentItem: productListItem, input: workflowInput }) => ({
        customer_id: workflowInput.customer_id,
        list_id: productListItem.list_id,
      })
    )

    assertCustomerOwnsProductListStep(ownershipInput)

    const linkDeleteInput = transform(
      { input },
      ({ input: workflowInput }) =>
        ({
          [PRODUCT_LIST_MODULE]: {
            product_list_item_id: workflowInput.item_id,
          },
        }) as DeleteEntityInput
    )

    removeRemoteLinkStep(linkDeleteInput)
    const deleted = deleteProductListItemStep(currentItem)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(deleted)
  }
)
