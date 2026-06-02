import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { acquireLockStep, releaseLockStep } from "@medusajs/medusa/core-flows"
import { createCustomerProductListStep } from "../steps/create-customer-product-list"
import { createProductListItemStep } from "../steps/create-product-list-item"
import type {
  AddFavoriteProductListItemWorkflowInput,
  AddFavoriteProductListItemWorkflowResult,
} from "../types"

export const addFavoriteProductListItemWorkflow = createWorkflow(
  {
    idempotent: false,
    name: "add-favorite-product-list-item-workflow",
  },
  (input: AddFavoriteProductListItemWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list-customer:${workflowInput.customer_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    })

    const favoriteList = createCustomerProductListStep({
      customer_id: input.customer_id,
      data: {},
      type: "favorite",
    })

    const itemInput = transform(
      { favoriteList, input },
      ({ favoriteList: listResult, input: workflowInput }) => ({
        customer_id: workflowInput.customer_id,
        list_id: listResult.product_list.id,
        metadata: workflowInput.metadata,
        note: workflowInput.note,
        product_id: workflowInput.product_id,
        sort_order: workflowInput.sort_order,
        variant_id: workflowInput.variant_id,
      })
    )

    const item = createProductListItemStep(itemInput)

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    const result = transform(
      { favoriteList, item },
      ({ favoriteList: listResult, item: productListItem }) =>
        ({
          item: productListItem,
          product_list: listResult.product_list,
        }) satisfies AddFavoriteProductListItemWorkflowResult
    )

    return new WorkflowResponse(result)
  }
)
