import "server-only"

import type { QueryClient } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { cookies } from "next/headers"
import type { HerbatikaMarketContext } from "../market-context"
import { getMarketServerContext } from "../market-context.server"
import {
  REGION_COUNTRY_CODE_STORAGE_KEY,
  REGION_STORAGE_KEY,
  resolveRegionInfoFromCookieValues,
} from "../region-preferences"
import { resolveRegionForMarket, toRegionInfo } from "../region-selection"
import {
  fetchCompleteServerRegionList,
  fetchServerProduct,
  prefetchServerProductAttributes,
  prefetchServerProductReviews,
  prefetchServerProducts,
} from "../storefront-server"
import type {
  ProductDetailParams,
  ProductListParams,
  ProductReviewListParams,
} from "./types"

const resolveCookieRegionPreference = async (): Promise<RegionInfo | null> => {
  const cookieStore = await cookies()

  return resolveRegionInfoFromCookieValues(
    cookieStore.get(REGION_STORAGE_KEY)?.value,
    cookieStore.get(REGION_COUNTRY_CODE_STORAGE_KEY)?.value
  )
}

type GetRegionServerContextOptions = {
  marketContext?: HerbatikaMarketContext
}

export const getRegionServerContext = async (
  options: GetRegionServerContextOptions = {}
) => {
  const queryClient = getServerQueryClient()
  const [cookieRegionPreference, resolvedMarketContext] = await Promise.all([
    resolveCookieRegionPreference(),
    options.marketContext
      ? Promise.resolve(options.marketContext)
      : getMarketServerContext(),
  ])

  const regionListResponse = await fetchCompleteServerRegionList(queryClient)

  const resolvedRegionRecord = resolveRegionForMarket(
    regionListResponse.regions,
    resolvedMarketContext,
    cookieRegionPreference?.region_id
  )
  const region = resolvedRegionRecord
    ? toRegionInfo(resolvedRegionRecord, resolvedMarketContext)
    : null

  return {
    locale: resolvedMarketContext.locale,
    marketContext: resolvedMarketContext,
    queryClient,
    region,
  }
}

export const prefetchProductList = async (
  queryClient: QueryClient,
  listParams: ProductListParams
) => {
  await prefetchServerProducts(queryClient, listParams)
}

export const prefetchProductDetail = async (
  queryClient: QueryClient,
  detailParams: ProductDetailParams
) => fetchServerProduct(queryClient, detailParams)

export const prefetchProductReviews = async (
  queryClient: QueryClient,
  listParams: ProductReviewListParams
) => {
  await prefetchServerProductReviews(queryClient, listParams)
}

export const prefetchProductAttributes = async (
  queryClient: QueryClient,
  productId: string,
  salesChannelId: string
) => {
  await prefetchServerProductAttributes(queryClient, {
    productId,
    salesChannelId,
  })
}
