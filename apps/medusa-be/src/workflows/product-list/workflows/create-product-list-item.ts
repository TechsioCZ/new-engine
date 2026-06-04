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
import { assertCustomerOwnsProductListStep } from "../steps/assert-customer-owns-product-list"
import { createProductListItemStep } from "../steps/create-product-list-item"
import type { CreateProductListItemWorkflowInput } from "../types"

export const createProductListItemWorkflow = createWorkflow(
  "create-product-list-item-workflow",
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

    const ownershipInput = transform({ input }, ({ input: workflowInput }) => ({
      customer_id: workflowInput.customer_id,
      list_id: workflowInput.list_id,
    }))

    assertCustomerOwnsProductListStep(ownershipInput)

    const itemResult = createProductListItemStep(input)
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

    createRemoteLinkStep(productListItemLinks)

    const item = transform(
      { itemResult },
      ({ itemResult: createdItemResult }) => createdItemResult.item
    )

    releaseLockStep({
      executeOnSubWorkflow: true,
      key: lockKey,
    })

    return new WorkflowResponse(item)
  }
)
