import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import { normalizeProductListType } from "../../../modules/product-list/normalizers"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListRecord } from "../types"

export const deleteProductListStep = createStep(
  "delete-product-list",
  async (list: ProductListRecord, { container }) => {
    const productListType = normalizeProductListType(list.type)

    if (productListType !== "custom") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Only custom product lists can be deleted"
      )
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .deleteProductLists(list.id)

    return new StepResponse({ id: list.id }, list)
  },
  async (list, { container }) => {
    if (!list?.id) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .createProductLists({
        id: list.id,
        access_type: list.access_type ?? "private",
        description: list.description ?? null,
        handle: list.handle,
        metadata: list.metadata ?? null,
        title: list.title,
        type: list.type,
      })
  }
)
