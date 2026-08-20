import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { ProductBrandLink } from "../../../../../links/product-brand"
import {
  readPublishedBrandLocalization,
  readPublishedBrandScope,
  sendBrandLocalizationFailure,
  sendPublishedBrandScopeFailure,
} from "../../../../../utils/published-brand-scope"
import { normalizeProductSalesChannelFilter } from "../../../../utils/product-filters"
import type { StoreBrandsDetailProductsSchemaType } from "../../validators"

type StoreBrandProductsRequest = MedusaRequest<
  unknown,
  StoreBrandsDetailProductsSchemaType
> & {
  publishable_key_context?: { sales_channel_ids?: unknown } | null
}

export async function GET(req: StoreBrandProductsRequest, res: MedusaResponse) {
  const brandId = req.params.id ?? "-1"
  const publicationScope = await readPublishedBrandScope({
    container: req.scope,
    locale: req.locale,
    salesChannelIds: req.publishable_key_context?.sales_channel_ids,
  })
  if (
    publicationScope.kind === "invalid-response" ||
    publicationScope.kind === "unavailable"
  ) {
    sendPublishedBrandScopeFailure(publicationScope, res)
    return
  }
  if (
    publicationScope.kind === "published" &&
    !publicationScope.brandIds.includes(brandId)
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Brand with id "${brandId}" was not found`
    )
  }
  if (publicationScope.kind === "published") {
    const localization = await readPublishedBrandLocalization({
      brandIds: [brandId],
      container: req.scope,
      market: publicationScope.market,
    })
    if (localization.kind === "failure") {
      sendBrandLocalizationFailure(localization.code, res)
      return
    }
  }

  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)
  const brandQuery = {
    entity: "brand",
    fields: ["id"],
    filters: {
      id: brandId,
    },
  }
  const { data: brands } =
    publicationScope.kind === "published"
      ? await query.graph(brandQuery, { locale: req.locale })
      : await query.graph(brandQuery)

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

  const productQuery = {
    entity: "product",
    fields: req.queryConfig.fields,
    filters,
    pagination: req.queryConfig.pagination,
  }
  const { data: products, metadata } =
    publicationScope.kind === "published"
      ? await query.graph(productQuery, { locale: req.locale })
      : await query.graph(productQuery)

  res.json({
    products,
    count: metadata?.count ?? products.length,
    offset: metadata?.skip,
    limit: metadata?.take,
  })
}
