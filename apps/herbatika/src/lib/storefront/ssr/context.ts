import type { QueryClient } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import { requireConfiguredMarketRuntimeBinding } from "@/lib/market/market-runtime.server"
import type { Market } from "@/lib/url/types"
import { resolveBoundRegion } from "../market-region-authority"
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "../region-query-config"
import {
  fetchServerProduct,
  fetchServerRegions,
  prefetchServerProductAttributes,
  prefetchServerProductReviews,
  prefetchServerProducts,
} from "../storefront-server"
import type {
  ProductDetailParams,
  ProductListParams,
  ProductReviewListParams,
  RegionListParams,
} from "./types"

export type ExplicitRequestServerContext = Readonly<{
  cookieHeader?: string
  market: Market
}>

export const getRegionServerContext = async (
  requestContext: ExplicitRequestServerContext
) => {
  const queryClient = getServerQueryClient()
  const binding = requireConfiguredMarketRuntimeBinding(requestContext.market)

  const listParams: RegionListParams = {
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  }

  const regionListResponse = await fetchServerRegions(
    binding.market,
    queryClient,
    listParams
  )
  const region = resolveBoundRegion(binding, regionListResponse.regions)

  return {
    binding,
    locale: binding.locale,
    market: binding.market,
    queryClient,
    region,
  }
}

export const prefetchProductList = async (
  market: Market,
  queryClient: QueryClient,
  listParams: ProductListParams
) => {
  await prefetchServerProducts(market, queryClient, listParams)
}

export const prefetchProductDetail = async (
  market: Market,
  queryClient: QueryClient,
  detailParams: ProductDetailParams
) => fetchServerProduct(market, queryClient, detailParams)

export const prefetchProductReviews = async (
  market: Market,
  queryClient: QueryClient,
  listParams: ProductReviewListParams
) => {
  await prefetchServerProductReviews(market, queryClient, listParams)
}

export const prefetchProductAttributes = async (
  market: Market,
  queryClient: QueryClient,
  productId: string
) => {
  await prefetchServerProductAttributes(market, queryClient, { productId })
}
