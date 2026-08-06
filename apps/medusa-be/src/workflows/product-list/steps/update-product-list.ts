import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

import { PRODUCT_LIST_MODULE } from "../../../modules/product-list/constants"
import type ProductListModuleService from "../../../modules/product-list/service"
import type { ProductListRecord } from "../types"

export interface UpdateProductListStepInput {
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

    if (previousList.id !== input.list_id) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Retrieved product list "${previousList.id}" did not match requested list "${input.list_id}".`,
      )
    }

    const productList = await service.updateCustomProductList(
      previousList.id,
      input.data,
    )

    return new StepResponse<ProductListRecord, ProductListRecord>(
      productList,
      previousList,
    )
  },
  async (list, { container }) => {
    if (list?.id === undefined || list.id.length === 0) {
      return
    }

    await container
      .resolve<ProductListModuleService>(PRODUCT_LIST_MODULE)
      .updateProductLists({
        access_type: list.access_type ?? "private",
        description: list.description ?? null,
        handle: list.handle,
        id: list.id,
        metadata: list.metadata ?? null,
        title: list.title,
      })
  },
)
