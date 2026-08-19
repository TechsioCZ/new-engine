import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import { assertCustomerOwnsProductListStep } from "../steps/assert-customer-owns-product-list"
import { assertProductListCartMarketContextStep } from "../steps/assert-product-list-cart-market-context"
import { getProductListCartItemsStep } from "../steps/get-product-list-cart-items"
import type { CreateCartFromProductListWorkflowInput } from "../types"

export const createCartFromProductListWorkflow = createWorkflow(
  "create-cart-from-product-list",
  (input: CreateCartFromProductListWorkflowInput) => {
    const ownershipInput = transform({ input }, ({ input: workflowInput }) => ({
      customer_id: workflowInput.customer_id,
      list_id: workflowInput.list_id,
    }))

    assertCustomerOwnsProductListStep(ownershipInput)

    const marketContextInput = transform(
      { input },
      ({ input: workflowInput }) => ({
        country_code: workflowInput.country_code,
        region_id: workflowInput.region_id,
        sales_channel_id: workflowInput.sales_channel_id,
      })
    )
    const validatedMarketContext =
      assertProductListCartMarketContextStep(marketContextInput)

    const listId = transform(
      { input },
      ({ input: workflowInput }) => workflowInput.list_id
    )
    const cartItems = getProductListCartItemsStep(listId)
    const cartInput = transform(
      { cartItems, input, validatedMarketContext },
      ({
        cartItems: items,
        input: workflowInput,
        validatedMarketContext: resolvedMarketContext,
      }) => ({
        country_code: workflowInput.country_code,
        customer_id: workflowInput.customer_id,
        email: workflowInput.email,
        items,
        region_id: resolvedMarketContext.region_id,
        sales_channel_id: resolvedMarketContext.sales_channel_id,
      })
    )
    const cart = createCartWorkflow.runAsStep({
      input: cartInput,
    })

    return new WorkflowResponse(cart)
  }
)
