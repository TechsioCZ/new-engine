import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { ProductBrandLink } from "../../../../../links/product-brand"
import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import type { StoreBrandsDetailProductsSchemaType } from "../../validators"

export async function GET(
  req: MedusaRequest<unknown, StoreBrandsDetailProductsSchemaType>,
  res: MedusaResponse
) {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const brandId = req.params["id"] ?? "-1"
  const { data: brands } = await query.graph({
    entity: "brand",
    fields: ["id"],
    filters: {
      id: brandId,
    },
  })

  if (!brands.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${brandId}" was not found`
    )
  }

  const { data: productLinks } = await query.graph({
    entity: ProductBrandLink.entryPoint,
    filters: {
      brand_id: brandId,
    },
    fields: ["product_id"],
  })
  const linkedProductIds = productLinks.flatMap((link) =>
    typeof link.product_id === "string" ? [link.product_id] : []
  )

  if (!linkedProductIds.length) {
    res.json({
      products: [],
      count: 0,
      offset: req.queryConfig.pagination?.skip ?? 0,
      limit: req.queryConfig.pagination?.take,
    })
    return
  }

  const filters = await normalizeProductSalesChannelFilter(query, remoteQuery, {
    ...req.filterableFields,
    id: linkedProductIds,
  })

  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: req.queryConfig.fields,
    filters,
    pagination: req.queryConfig.pagination,
  })

  res.json({
    products,
    count: metadata?.count ?? products.length,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
