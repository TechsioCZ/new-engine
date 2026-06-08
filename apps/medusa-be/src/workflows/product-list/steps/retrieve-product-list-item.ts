import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListItemRecord } from "../types"

export const retrieveProductListItemStep = createStep(
  "retrieve-product-list-item",
  async (itemId: string, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const item = await service.retrieveProductListItem(itemId)

    return new StepResponse<ProductListItemRecord>(item)
  }
)
