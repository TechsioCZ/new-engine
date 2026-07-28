import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { filterProductRecords, type ProductRecord } from "./review-normalizers"

const PRODUCT_QUERY_CHUNK_SIZE = 100

const chunkProductIds = (productIds: string[]) => {
  const chunks: string[][] = []

  for (
    let index = 0;
    index < productIds.length;
    index += PRODUCT_QUERY_CHUNK_SIZE
  ) {
    chunks.push(productIds.slice(index, index + PRODUCT_QUERY_CHUNK_SIZE))
  }

  return chunks
}

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
