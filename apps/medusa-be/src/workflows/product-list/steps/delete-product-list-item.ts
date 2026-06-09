import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListItemRecord } from "../types"

export const deleteProductListItemStep = createStep(
  "delete-product-list-item",
  async (item: ProductListItemRecord, { container }) => {
    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .deleteProductListItems(item.id)

    return new StepResponse({ id: item.id }, item)
  },
  async (item, { container }) => {
    if (!item?.list_id) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .createProductListItems({
        id: item.id,
        list_id: item.list_id,
        metadata: item.metadata ?? null,
        note: item.note ?? null,
        quantity: item.quantity,
        sort_order: item.sort_order,
      })
  }
)
