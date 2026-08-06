import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord } from "@techsio/std/object"

import { ProductBrandLink } from "../../../../../links/product-brand"
import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import type { StoreBrandsDetailProductsSchemaType } from "../../validators"

const get = async (
  req: MedusaRequest<unknown, StoreBrandsDetailProductsSchemaType>,
  res: MedusaResponse,
) => {
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
      `Brand with id "${brandId}" was not found`,
    )
  }

  const productLinkResult = await query.graph({
    entity: ProductBrandLink.entryPoint,
    fields: ["product_id"],
    filters: {
      brand_id: brandId,
    },
  })
  const productLinks: unknown = productLinkResult.data
  const linkedProductIds = Array.isArray(productLinks)
    ? productLinks.flatMap((link: unknown) => {
        if (!(isRecord(link) && typeof link["product_id"] === "string")) {
          return []
        }

        return [link["product_id"]]
      })
    : []

  if (!linkedProductIds.length) {
    res.json({
      count: 0,
      limit: req.queryConfig.pagination?.take,
      offset: req.queryConfig.pagination?.skip ?? 0,
      products: [],
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
    count: metadata?.count ?? products.length,
    limit: metadata?.take,
    offset: metadata?.skip,
    products,
  })
}

export { get as GET }
