import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListItemRecord } from "../types"

export type UpdateProductListItemStepInput = {
  item_id: string
  list_id: string
  previous_item: ProductListItemRecord
  data: {
    quantity?: number
    note?: string | null
    sort_order?: number
    metadata?: Record<string, unknown> | null
  }
}

export const updateProductListItemStep = createStep(
  "update-product-list-item",
  async (input: UpdateProductListItemStepInput, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const item = await service.updateProductListItemForList(
      input.item_id,
      input.data
    )

    return new StepResponse<ProductListItemRecord, ProductListItemRecord>(
      item,
      input.previous_item
    )
  },
  async (item, { container }) => {
    if (!item?.id) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .updateProductListItems({
        id: item.id,
        metadata: item.metadata ?? null,
        note: item.note ?? null,
        quantity: item.quantity,
        sort_order: item.sort_order,
      })
  }
)
