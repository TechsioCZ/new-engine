import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type {
  IncrementProductListItemWorkflowInput,
  ProductListItemRecord,
} from "../types"
import { assertCustomerOwnsProductList, getProductListService } from "./helpers"

type CompensationInput = {
  item_id: string
  previous_quantity: number
}

export const incrementProductListItemStep = createStep(
  "increment-product-list-item",
  async (input: IncrementProductListItemWorkflowInput, { container }) => {
    const service = getProductListService(container)
    const currentItem = await service.retrieveProductListItem(input.item_id)

    await assertCustomerOwnsProductList(
      container,
      input.customer_id,
      currentItem.list_id
    )
    await service.assertListSupportsQuantityIncrement(currentItem.list_id)

    const item = await service.incrementProductListItemQuantity(
      input.item_id,
      input.quantity
    )

    return new StepResponse<ProductListItemRecord, CompensationInput>(item, {
      item_id: input.item_id,
      previous_quantity: currentItem.quantity,
    })
  },
  async (input, { container }) => {
    if (!input?.item_id) {
      return
    }

    await getProductListService(container).updateProductListItems({
      id: input.item_id,
      quantity: input.previous_quantity,
    })
  }
)
