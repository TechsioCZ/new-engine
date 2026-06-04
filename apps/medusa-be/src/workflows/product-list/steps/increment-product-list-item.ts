import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import { normalizeProductListType } from "../../../modules/product-list/normalizers"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListItemRecord } from "../types"

export type IncrementProductListItemStepInput = {
  item_id: string
  list_id: string
  previous_quantity: number
  quantity: number
}

type CompensationInput = {
  item_id: string
  previous_quantity: number
}

export const incrementProductListItemStep = createStep(
  "increment-product-list-item",
  async (input: IncrementProductListItemStepInput, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const productList = await service.retrieveProductList(input.list_id)
    const productListType = normalizeProductListType(productList.type)

    if (productListType !== "custom") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only custom product lists support quantity increments"
      )
    }

    const item = await service.incrementProductListItemQuantity(
      input.item_id,
      input.quantity
    )

    return new StepResponse<ProductListItemRecord, CompensationInput>(item, {
      item_id: input.item_id,
      previous_quantity: input.previous_quantity,
    })
  },
  async (input, { container }) => {
    if (!input?.item_id) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .updateProductListItems({
        id: input.item_id,
        quantity: input.previous_quantity,
      })
  }
)
