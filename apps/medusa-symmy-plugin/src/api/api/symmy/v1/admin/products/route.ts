import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refetchEntities } from "@medusajs/framework/http"
import {
  remapKeysForProduct,
  remapProductResponse,
} from "@medusajs/medusa/api/admin/products/helpers"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const selectFields = remapKeysForProduct(req.queryConfig.fields ?? [])
  const { data: products, metadata } = await refetchEntities({
    entity: "product",
    idOrFilter: req.filterableFields,
    scope: req.scope,
    fields: selectFields,
    pagination: req.queryConfig.pagination,
    withDeleted: req.queryConfig.withDeleted,
  })

  res.json({
    products: products.map(remapProductResponse),
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
