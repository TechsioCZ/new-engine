import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createCartWorkflow } from "@medusajs/medusa/core-flows"
import { assertCustomerOwnsProductListStep } from "../steps/assert-customer-owns-product-list"
import { getProductListCartItemsStep } from "../steps/get-product-list-cart-items"
import type { CreateCartFromProductListWorkflowInput } from "../types"

export const createCartFromProductListWorkflow = createWorkflow(
  "create-cart-from-product-list-workflow",
  (input: CreateCartFromProductListWorkflowInput) => {
    const ownershipInput = transform({ input }, ({ input: workflowInput }) => ({
      customer_id: workflowInput.customer_id,
      list_id: workflowInput.list_id,
    }))

    assertCustomerOwnsProductListStep(ownershipInput)

    const listId = transform(
      { input },
      ({ input: workflowInput }) => workflowInput.list_id
    )
    const cartItems = getProductListCartItemsStep(listId)
    const cartInput = transform(
      { cartItems, input },
      ({ cartItems: items, input: workflowInput }) => ({
        country_code: workflowInput.country_code,
        customer_id: workflowInput.customer_id,
        email: workflowInput.email,
        items,
        region_id: workflowInput.region_id,
        sales_channel_id: workflowInput.sales_channel_id,
      })
    )
    const cart = createCartWorkflow.runAsStep({
      input: cartInput,
    })

    return new WorkflowResponse(cart)
  }
)
