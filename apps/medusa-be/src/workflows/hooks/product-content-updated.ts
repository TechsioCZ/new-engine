import type { StepExecutionContext } from "@medusajs/framework/workflows-sdk"
import {
  getLegacyProductContent,
  type ProductContentValues,
} from "../../utils/product-content"
import {
  getProductContentService,
  type ProductContentRecord,
} from "../../utils/product-content-service"

export type UpdatedProduct = {
  id: string
  metadata?: Record<string, unknown> | null
}

export type ProductContentUpdateCompensation = {
  createdIds: string[]
  previous: ProductContentRecord[]
}

type ProductContentHookContext = Pick<StepExecutionContext, "container">

export const updateProductContentForUpdatedProducts = async (
  products: readonly UpdatedProduct[],
  { container }: ProductContentHookContext
) => {
  const productIds = products.map(({ id }) => id)

  if (productIds.length === 0) {
    return { createdIds: [], previous: [] }
  }

  const service = getProductContentService(container)
  const existing = (await service.listProductContents({
    product_id: productIds,
  })) as ProductContentRecord[]
  const existingByProductId = new Map(
    existing.map((record) => [record.product_id, record])
  )
  const toCreate: Array<ProductContentValues & { product_id: string }> = []
  const toUpdate: Array<ProductContentValues & { id: string }> = []

  for (const product of products) {
    const content = getLegacyProductContent(product.metadata)
    const record = existingByProductId.get(product.id)

    if (record) {
      toUpdate.push({ id: record.id, ...content })
    } else {
      toCreate.push({ product_id: product.id, ...content })
    }
  }

  const created = toCreate.length
    ? ((await service.createProductContents(
        toCreate
      )) as ProductContentRecord[])
    : []

  if (toUpdate.length) {
    await service.updateProductContents(toUpdate)
  }

  return {
    createdIds: created.map(({ id }) => id),
    previous: existing,
  }
}

export const restoreUpdatedProductContent = async (
  compensation: ProductContentUpdateCompensation | undefined,
  { container }: ProductContentHookContext
) => {
  if (!compensation) {
    return
  }

  const service = getProductContentService(container)
  if (compensation.createdIds.length) {
    await service.deleteProductContents(compensation.createdIds)
  }
  if (compensation.previous.length) {
    await service.updateProductContents(compensation.previous)
  }
}
