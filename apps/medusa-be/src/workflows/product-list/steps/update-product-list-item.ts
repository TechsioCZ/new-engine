import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import { parseProductListMetadata } from "../../../modules/product-list/schemas"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { UpdateProductListItemDTO } from "../../../modules/product-list/service"
import type { ProductListItemRecord } from "../types"

export interface UpdateProductListItemStepInput {
  item_id: string
  list_id: string
  previous_item: ProductListItemRecord
  data: UpdateProductListItemDTO
}

export const updateProductListItemStep = createStep(
  "update-product-list-item",
  async (input: UpdateProductListItemStepInput, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const item = await service.updateProductListItemForList(
      input.item_id,
      input.data,
    )

    return new StepResponse<ProductListItemRecord, ProductListItemRecord>(
      item,
      input.previous_item,
    )
  },
  async (previousItem, { container }) => {
    if (
      previousItem === undefined ||
      previousItem.id === undefined ||
      previousItem.id.length === 0
    ) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .updateProductListItems({
        id: previousItem.id,
        metadata: parseProductListMetadata(previousItem.metadata),
        note: previousItem.note ?? null,
        quantity: previousItem.quantity,
        sort_order: previousItem.sort_order,
      })
  },
)
