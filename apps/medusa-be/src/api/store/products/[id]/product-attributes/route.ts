import type {
  MedusaResponse,
  MedusaStoreRequest,
} from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import type { StoreProductAttributesQuery } from "./middlewares"
import {
  listPublicStoreProductAttributes,
  type StoreProductAttributeResponse,
} from "./utils"

export async function GET(
  req: MedusaStoreRequest<unknown, StoreProductAttributesQuery>,
  res: MedusaResponse<{
    count: number
    limit: number
    offset: number
    product_attributes: StoreProductAttributeResponse[]
  }>
) {
  const productId = req.params["id"]
  if (!productId) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "A Product id is required."
    )
  }
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const productFilters = await normalizeProductSalesChannelFilter(
    query,
    remoteQuery,
    {
      ...req.filterableFields,
      id: productId,
    }
  )
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
    filters: productFilters,
    pagination: { take: 1 },
  })

  if (!products[0]) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Product with id "${productId}" was not found`
    )
  }

  const { skip: offset, take = 20 } = req.queryConfig.pagination
  const page = await listPublicStoreProductAttributes({
    limit: take,
    ...(req.locale === undefined ? {} : { locale: req.locale }),
    offset,
    productId,
    query,
  })

  res.json({
    count: page.count,
    limit: take,
    offset,
    product_attributes: page.product_attributes,
  })
}
