import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { filterProductRecords, type ProductRecord } from "./review-normalizers"
import { chunkProductIds } from "./review-products-helpers"

export const getProductsById = async (
  req: MedusaRequest,
  productIds: string[]
) => {
  if (!productIds.length) {
    return new Map<string, ProductRecord>()
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const productsById = new Map<string, ProductRecord>()

  for (const productIdChunk of chunkProductIds(productIds)) {
    const { data } = await query.graph({
      entity: Modules.PRODUCT,
      fields: ["id", "title", "handle", "thumbnail"],
      filters: {
        id: { $in: productIdChunk },
      },
    })

    for (const product of filterProductRecords(data)) {
      productsById.set(product.id, product)
    }
  }

  return productsById
}
