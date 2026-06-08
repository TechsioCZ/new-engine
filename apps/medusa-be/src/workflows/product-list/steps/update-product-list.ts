import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListRecord } from "../types"

export type UpdateProductListStepInput = {
  list_id: string
  data: {
    title?: string
    handle?: string
    access_type?: "private" | "public"
    description?: string | null
    metadata?: Record<string, unknown> | null
  }
}

export const updateProductListStep = createStep(
  "update-product-list",
  async (input: UpdateProductListStepInput, { container }) => {
    const service =
      container.resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
    const previousList = await service.retrieveProductList(input.list_id)
    const productList = await service.updateCustomProductList(
      input.list_id,
      input.data
    )

    return new StepResponse<ProductListRecord, ProductListRecord>(
      productList,
      previousList
    )
  },
  async (list, { container }) => {
    if (!list?.id) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .updateProductLists({
        id: list.id,
        access_type: list.access_type ?? "private",
        description: list.description ?? null,
        handle: list.handle,
        metadata: list.metadata ?? null,
        title: list.title,
      })
  }
)
