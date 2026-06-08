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
import { deleteProductListStep } from "../steps/delete-product-list"
import { deleteProductListItemsStep } from "../steps/delete-product-list-items"
import { listProductListItemIdsStep } from "../steps/list-product-list-item-ids"
import { retrieveProductListStep } from "../steps/retrieve-product-list"
import type { DeleteProductListWorkflowInput } from "../types"

export const deleteProductListWorkflow = createWorkflow(
  "delete-product-list-workflow",
  (input: DeleteProductListWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list:${workflowInput.list_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })
    const listId = transform(
      { input },
      ({ input: workflowInput }) => workflowInput.list_id
    )
    const currentList = retrieveProductListStep(listId)
    const ownershipInput = transform({ input }, ({ input: workflowInput }) => ({
      customer_id: workflowInput.customer_id,
      list_id: workflowInput.list_id,
    }))

    assertCustomerOwnsProductListStep(ownershipInput)

    const itemIds = listProductListItemIdsStep(listId)
    const itemLinkDeleteInput = transform({ itemIds }, ({ itemIds: ids }) =>
      ids.map(
        (itemId) =>
          ({
            [PRODUCT_LIST_MODULE]: {
              product_list_item_id: itemId,
            },
          }) satisfies DeleteEntityInput
      )
    )

    removeRemoteLinkStep(itemLinkDeleteInput).config({
      name: "remove-product-list-item-links",
    })
    deleteProductListItemsStep(itemIds)

    const customerLinkDeleteInput = transform(
      { input },
      ({ input: workflowInput }) =>
        ({
          [PRODUCT_LIST_MODULE]: {
            product_list_id: workflowInput.list_id,
          },
        }) satisfies DeleteEntityInput
    )

    removeRemoteLinkStep(customerLinkDeleteInput).config({
      name: "remove-customer-product-list-link",
    })
    const deleted = deleteProductListStep(currentList)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(deleted)
  }
)
