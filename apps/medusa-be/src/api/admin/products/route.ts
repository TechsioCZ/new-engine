import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refetchEntities } from "@medusajs/framework/http"
import type { ProductDTO } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  remapKeysForProduct,
  remapProductResponse,
} from "@medusajs/medusa/api/admin/products/helpers"

import { normalizeProductSalesChannelFilter } from "../../utils/product-filters"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const selectFields = remapKeysForProduct(req.queryConfig.fields ?? [])
  const { data: products, metadata } = await refetchEntities({
    entity: "product",
    idOrFilter: await normalizeProductSalesChannelFilter(
      req.scope.resolve(ContainerRegistrationKeys.QUERY),
      req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY),
      req.filterableFields
    ),
    scope: req.scope,
    fields: selectFields,
    pagination: req.queryConfig.pagination,
    ...(req.queryConfig.withDeleted !== undefined
      ? { withDeleted: req.queryConfig.withDeleted }
      : {}),
  })

  res.json({
    products: products.map((product) =>
      // Medusa applies this helper to field-selected graph results, but its
      // public parameter type is the stricter, fully populated ProductDTO.
      remapProductResponse(product as ProductDTO)
    ),
    count: metadata.count,
    offset: metadata.skip,
    limit: metadata.take,
  })
}
