import type { MedusaRequest } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { ProductRecord } from "../../review-normalizers"

export const getProductsById = async (
  req: MedusaRequest,
  productIds: string[]
) => {
  if (!productIds.length) {
    return new Map<string, ProductRecord>()
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail"],
    filters: {
      id: { $in: productIds },
    },
  })

  return new Map(
    (data as ProductRecord[]).map((product) => [product.id, product])
  )
}
