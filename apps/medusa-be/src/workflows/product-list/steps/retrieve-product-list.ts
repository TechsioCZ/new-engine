import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListRecord } from "../types"

export const retrieveProductListStep = createStep(
  "retrieve-product-list",
  async (listId: string, { container }) => {
    const list = await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .retrieveProductList(listId)

    return new StepResponse<ProductListRecord>(list)
  }
)
