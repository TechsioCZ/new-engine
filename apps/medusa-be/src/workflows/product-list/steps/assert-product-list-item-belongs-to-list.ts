import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import type { ProductListItemRecord } from "../types"

export type AssertProductListItemBelongsToListStepInput = {
  expected_list_id?: string
  item: ProductListItemRecord
}

export const assertProductListItemBelongsToListStep = createStep(
  "assert-product-list-item-belongs-to-list",
  async (input: AssertProductListItemBelongsToListStepInput) => {
    if (
      input.expected_list_id !== undefined &&
      input.item.list_id !== input.expected_list_id
    ) {
      // Intentionally return NOT_FOUND to avoid leaking that an item exists on another list.
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Product list item ${input.item.id} was not found`
      )
    }

    return new StepResponse({ item_id: input.item.id })
  }
)
