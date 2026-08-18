import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import {
  getLegacyProductContent,
  type ProductContentValues,
} from "../../utils/product-content"
import {
  getProductContentService,
  type ProductContentRecord,
} from "../../utils/product-content-service"

type UpdatedProduct = {
  id: string
  metadata?: Record<string, unknown> | null
}

type ProductContentUpdateCompensation = {
  createdIds: string[]
  previous: ProductContentRecord[]
}

updateProductsWorkflow.hooks.productsUpdated(
  async ({ products }, { container }) => {
    const updatedProducts = products as UpdatedProduct[]
    const productIds = updatedProducts.map(({ id }) => id)

    if (productIds.length === 0) {
      return new StepResponse(undefined, { createdIds: [], previous: [] })
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

    for (const product of updatedProducts) {
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

    return new StepResponse<undefined, ProductContentUpdateCompensation>(
      undefined,
      {
        createdIds: created.map(({ id }) => id),
        previous: existing,
      }
    )
  },
  async (compensation, { container }) => {
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
)
