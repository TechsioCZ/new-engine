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
    fields: selectFields,
    idOrFilter: req.filterableFields,
    pagination: req.queryConfig.pagination,
    scope: req.scope,
    ...(req.queryConfig.withDeleted === undefined
      ? {}
      : { withDeleted: req.queryConfig.withDeleted }),
  })

  res.json({
    count: metadata.count,
    limit: metadata.take,
    offset: metadata.skip,
    products: products.map(remapProductResponse),
  })
}
