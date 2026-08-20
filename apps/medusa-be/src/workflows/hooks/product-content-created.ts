import type { StepExecutionContext } from "@medusajs/framework/workflows-sdk"
import {
  getLegacyProductContent,
  type ProductContentValues,
} from "../../utils/product-content"
import {
  getProductContentService,
  type ProductContentRecord,
} from "../../utils/product-content-service"

export type CreatedProduct = {
  id: string
  metadata?: Record<string, unknown> | null
}

type ProductContentHookContext = Pick<StepExecutionContext, "container">

export const createProductContentForCreatedProducts = async (
  products: readonly CreatedProduct[],
  { container }: ProductContentHookContext
) => {
  const productIds = products.map(({ id }) => id)

  if (productIds.length === 0) {
    return []
  }

  const service = getProductContentService(container)
  const existing = (await service.listProductContents({
    product_id: productIds,
  })) as ProductContentRecord[]
  const existingProductIds = new Set(
    existing.map(({ product_id }) => product_id)
  )
  const inputs = products
    .filter(({ id }) => !existingProductIds.has(id))
    .map(({ id, metadata }) => ({
      ...(getLegacyProductContent(metadata) satisfies ProductContentValues),
      product_id: id,
    }))

  if (inputs.length === 0) {
    return []
  }

  const created = (await service.createProductContents(
    inputs
  )) as ProductContentRecord[]

  return created.map(({ id }) => id)
}

export const deleteCreatedProductContent = async (
  ids: readonly string[] | undefined,
  { container }: ProductContentHookContext
) => {
  if (ids?.length) {
    await getProductContentService(container).deleteProductContents([...ids])
  }
}
