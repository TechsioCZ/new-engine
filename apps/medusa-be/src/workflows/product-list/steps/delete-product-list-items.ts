import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"

export const deleteProductListItemsStep = createStep(
  "delete-product-list-items",
  async (itemIds: string[], { container }) => {
    if (!itemIds.length) {
      return new StepResponse({ ids: [] as string[] })
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .deleteProductListItems(itemIds)

    return new StepResponse({ ids: itemIds })
  }
)
