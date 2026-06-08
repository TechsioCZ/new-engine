import type { LinkDefinition } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  createRemoteLinkStep,
  releaseLockStep,
} from "@medusajs/medusa/core-flows"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import { createCustomerProductListStep } from "../steps/create-customer-product-list"
import { createProductListItemStep } from "../steps/create-product-list-item"
import type {
  AddFavoriteProductListItemWorkflowInput,
  AddFavoriteProductListItemWorkflowResult,
} from "../types"

export const addFavoriteProductListItemWorkflow = createWorkflow(
  "add-favorite-product-list-item-workflow",
  (input: AddFavoriteProductListItemWorkflowInput) => {
    const lockKey = transform({ input }, ({ input: workflowInput }) => [
      `product-list-customer:${workflowInput.customer_id}`,
    ])

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
      timeout: 2,
      ttl: 10,
    }).config({ name: "acquire-favorite-customer-lock" })

    const favoriteListInput = transform(
      { input },
      ({ input: workflowInput }) => ({
        customer_id: workflowInput.customer_id,
        data: {},
        type: "favorite" as const,
      })
    )

    const favoriteList = createCustomerProductListStep(favoriteListInput)
    const customerProductListLinks = transform(
      { favoriteList, input },
      ({ favoriteList: listResult, input: workflowInput }) => {
        if (!listResult.created) {
          return []
        }

        return [
          {
            [Modules.CUSTOMER]: {
              customer_id: workflowInput.customer_id,
            },
            [PRODUCT_LIST_MODULE]: {
              product_list_id: listResult.product_list.id,
            },
          },
        ]
      }
    )

    createRemoteLinkStep(customerProductListLinks).config({
      name: "create-favorite-customer-product-list-link",
    })

    const itemLockKey = transform(
      { favoriteList, input },
      ({ favoriteList: listResult, input: workflowInput }) => [
        `product-list-item:${listResult.product_list.id}:${workflowInput.product_id}:${workflowInput.variant_id ?? "product"}`,
      ]
    )

    acquireLockStep({
      executeOnSubWorkflow: true,
      key: itemLockKey,
      timeout: 2,
      ttl: 10,
    }).config({ name: "acquire-favorite-product-list-item-lock" })

    const itemInput = transform(
      { favoriteList, input },
      ({ favoriteList: listResult, input: workflowInput }) => ({
        customer_id: workflowInput.customer_id,
        list_id: listResult.product_list.id,
        metadata: workflowInput.metadata,
        note: workflowInput.note,
        product_id: workflowInput.product_id,
        quantity: workflowInput.quantity,
        sort_order: workflowInput.sort_order,
        variant_id: workflowInput.variant_id,
      })
    )

    const itemResult = createProductListItemStep(itemInput)
    const productListItemLinks = transform(
      { input, itemResult },
      ({ input: workflowInput, itemResult: createdItemResult }) => {
        if (!createdItemResult.created) {
          return []
        }

        const links: LinkDefinition[] = [
          {
            [PRODUCT_LIST_MODULE]: {
              product_list_item_id: createdItemResult.item.id,
            },
            [Modules.PRODUCT]: {
              product_id: workflowInput.product_id,
            },
          },
        ]

        if (workflowInput.variant_id) {
          links.push({
            [PRODUCT_LIST_MODULE]: {
              product_list_item_id: createdItemResult.item.id,
            },
            [Modules.PRODUCT]: {
              product_variant_id: workflowInput.variant_id,
            },
          })
        }

        return links
      }
    )

    createRemoteLinkStep(productListItemLinks).config({
      name: "create-favorite-product-list-item-links",
    })

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: itemLockKey,
    }).config({ name: "release-favorite-product-list-item-lock" })

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    }).config({ name: "release-favorite-customer-lock" })

    const result = transform(
      { favoriteList, itemResult },
      ({ favoriteList: listResult, itemResult: createdItemResult }) =>
        ({
          item: createdItemResult.item,
          product_list: listResult.product_list,
        }) satisfies AddFavoriteProductListItemWorkflowResult
    )

    return new WorkflowResponse(result)
  }
)
