import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import { getServerQueryClient } from "@techsio/storefront-data/server/get-query-client"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { assertServerOnly } from "@/lib/server-guard"
import {
  type RequestServerContext,
  resolveMarketServerContext,
} from "../market-context.server"
import {
  REGION_COUNTRY_CODE_STORAGE_KEY,
  REGION_STORAGE_KEY,
  resolveRegionInfoFromCookieValues,
} from "../region-preferences"
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "../region-query-config"
import { resolveRegionForMarket, toRegionInfo } from "../region-selection"
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

assertServerOnly("storefront/ssr/context")

const readCookieValue = (
  cookieHeader: string | undefined,
  name: string
): string | undefined => {
  const encodedValue = cookieHeader
    ?.split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1)

  if (!encodedValue) {
    return
  }

  try {
    return decodeURIComponent(encodedValue)
  } catch {
    return encodedValue
  }
}

const resolveCookieRegionPreference = (
  cookieHeader?: string
): RegionInfo | null =>
  resolveRegionInfoFromCookieValues(
    readCookieValue(cookieHeader, REGION_STORAGE_KEY),
    readCookieValue(cookieHeader, REGION_COUNTRY_CODE_STORAGE_KEY)
  )

export const getRegionServerContext = async (
  requestContext: RequestServerContext
) => {
  const queryClient = getServerQueryClient()
  const marketContext = resolveMarketServerContext(requestContext)
  const cookieRegionPreference = resolveCookieRegionPreference(
    requestContext.cookieHeader
  )

  const listParams: RegionListParams = {
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  }

  const regionListResponse = (await fetchServerRegions(
    queryClient,
    listParams
  )) as { regions: HttpTypes.StoreRegion[] }

  const resolvedRegionRecord = resolveRegionForMarket(
    regionListResponse.regions,
    marketContext,
    cookieRegionPreference?.region_id
  )
  const region = resolvedRegionRecord
    ? toRegionInfo(resolvedRegionRecord, marketContext)
    : null

  return {
    queryClient,
    region,
  }
}

export const prefetchProductList = async (
  queryClient: QueryClient,
  listParams: ProductListParams,
  requestContext: RequestServerContext
) => {
  await prefetchServerProducts(queryClient, listParams, requestContext)
}

export const prefetchProductDetail = async (
  queryClient: QueryClient,
  detailParams: ProductDetailParams,
  requestContext: RequestServerContext
) => fetchServerProduct(queryClient, detailParams, requestContext)

export const prefetchProductReviews = async (
  queryClient: QueryClient,
  listParams: ProductReviewListParams
) => {
  await prefetchServerProductReviews(queryClient, listParams)
}

export const prefetchProductAttributes = async (
  queryClient: QueryClient,
  productId: string
) => {
  await prefetchServerProductAttributes(queryClient, { productId })
}
