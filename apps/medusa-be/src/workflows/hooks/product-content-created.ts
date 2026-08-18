import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { createProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  getLegacyProductContent,
  type ProductContentValues,
} from "../../utils/product-content"
import {
  getProductContentService,
  type ProductContentRecord,
} from "../../utils/product-content-service"

type CreatedProduct = {
  id: string
  metadata?: Record<string, unknown> | null
}

createProductsWorkflow.hooks.productsCreated(
  async ({ products }, { container }) => {
    const createdProducts = products as CreatedProduct[]
    const productIds = createdProducts.map(({ id }) => id)

    if (productIds.length === 0) {
      return new StepResponse(undefined, [])
    }

    const service = getProductContentService(container)
    const existing = (await service.listProductContents({
      product_id: productIds,
    })) as ProductContentRecord[]
    const existingProductIds = new Set(
      existing.map(({ product_id }) => product_id)
    )
    const inputs = createdProducts
      .filter(({ id }) => !existingProductIds.has(id))
      .map(({ id, metadata }) => ({
        ...(getLegacyProductContent(metadata) satisfies ProductContentValues),
        product_id: id,
      }))

    if (inputs.length === 0) {
      return new StepResponse(undefined, [])
    }

    const created = (await service.createProductContents(
      inputs
    )) as ProductContentRecord[]

    return new StepResponse(
      undefined,
      created.map(({ id }) => id)
    )
  },
  async (ids: string[] | undefined, { container }) => {
    if (ids?.length) {
      await getProductContentService(container).deleteProductContents(ids)
    }
  }
)
