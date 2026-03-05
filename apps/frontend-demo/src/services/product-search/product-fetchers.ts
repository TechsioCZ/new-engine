import type { HttpTypes } from "@medusajs/types"
import { sdk } from "@/lib/medusa-client"
import { buildMedusaQuery } from "@/utils/server-filters"
import {
  collectCategoryProductIdsCached,
  collectMeiliProductIdsForQueryCached,
  collectVariantProductIdsForSizes,
} from "./collectors"
import { fetchMeiliHits } from "./http"
import {
  dedupeIdsFromHits,
  intersectIdsPreservingOrder,
  orderProductsByIds,
} from "./id-utils"
import type { RawProductListResponse, StoreProductRecord } from "./types"

const LARGE_ID_SET_WARNING_THRESHOLD = 5000
const MAX_EXPECTED_FETCH_IDS = 100

async function fetchProductsByIds(params: {
  productIds: string[]
  fields: string
  region_id?: string
  country_code: string
  signal?: AbortSignal
}): Promise<StoreProductRecord[]> {
  // Callers should pass a page-sized ID slice to avoid oversized query strings.
  const { productIds, fields, region_id, country_code, signal } = params
  if (productIds.length === 0) {
    return []
  }

  if (productIds.length > MAX_EXPECTED_FETCH_IDS) {
    console.warn(
      `[ProductSearch] fetchProductsByIds called with ${productIds.length} IDs; expected a pre-paged slice.`
    )
  }

  const productsQuery = buildMedusaQuery(undefined, {
    id: productIds,
    limit: productIds.length,
    offset: 0,
    fields,
    ...(region_id && { region_id }),
    country_code,
  })

  const productsResponse = await sdk.client.fetch<HttpTypes.StoreProductListResponse>(
    "/store/products",
    { query: productsQuery, signal }
  )

  return orderProductsByIds(
    (productsResponse.products || []) as StoreProductRecord[],
    productIds
  )
}

export async function fetchProductsViaVariantSearch(params: {
  sizes: string[]
  q?: string
  limit: number
  offset: number
  fields: string
  region_id?: string
  country_code: string
  signal?: AbortSignal
}): Promise<RawProductListResponse> {
  const { sizes, q, limit, offset, fields, region_id, country_code, signal } =
    params
  const productIds = await collectVariantProductIdsForSizes({ sizes, q, signal })
  const totalCount = productIds.length
  const pagedIds = productIds.slice(offset, offset + limit)
  const products = await fetchProductsByIds({
    productIds: pagedIds,
    fields,
    region_id,
    country_code,
    signal,
  })

  return {
    products,
    count: totalCount,
    limit,
    offset,
  }
}

export async function fetchProductsViaMeiliAndVariantSearch(params: {
  query: string
  sizes: string[]
  limit: number
  offset: number
  fields: string
  region_id?: string
  country_code: string
  signal?: AbortSignal
}): Promise<RawProductListResponse> {
  const { query, sizes, limit, offset, fields, region_id, country_code, signal } =
    params

  // Trade-off: we collect all IDs before intersecting to keep deterministic ordering.
  const [meiliIds, sizeIds] = await Promise.all([
    collectMeiliProductIdsForQueryCached(query, signal),
    collectVariantProductIdsForSizes({ sizes, signal }),
  ])

  if (
    meiliIds.length > LARGE_ID_SET_WARNING_THRESHOLD ||
    sizeIds.length > LARGE_ID_SET_WARNING_THRESHOLD
  ) {
    console.warn(
      `[ProductSearch] Large ID collections in MEILI_SIZE_INTERSECTION (meili=${meiliIds.length}, size=${sizeIds.length}).`
    )
  }

  const matchingIds = intersectIdsPreservingOrder(meiliIds, sizeIds)
  const totalCount = matchingIds.length
  const pagedIds = matchingIds.slice(offset, offset + limit)
  const products = await fetchProductsByIds({
    productIds: pagedIds,
    fields,
    region_id,
    country_code,
    signal,
  })

  return {
    products,
    count: totalCount,
    limit,
    offset,
  }
}

export async function fetchProductsViaMeiliAndCategorySearch(params: {
  query: string
  categories: string[]
  limit: number
  offset: number
  fields: string
  region_id?: string
  country_code: string
  signal?: AbortSignal
}): Promise<RawProductListResponse> {
  const {
    query,
    categories,
    limit,
    offset,
    fields,
    region_id,
    country_code,
    signal,
  } = params

  // Trade-off: we collect all IDs before intersecting to keep deterministic ordering.
  const [meiliIds, categoryIds] = await Promise.all([
    collectMeiliProductIdsForQueryCached(query, signal),
    collectCategoryProductIdsCached({
      categories,
      region_id,
      country_code,
      signal,
    }),
  ])

  if (
    meiliIds.length > LARGE_ID_SET_WARNING_THRESHOLD ||
    categoryIds.length > LARGE_ID_SET_WARNING_THRESHOLD
  ) {
    console.warn(
      `[ProductSearch] Large ID collections in MEILI_CATEGORY_INTERSECTION (meili=${meiliIds.length}, categories=${categoryIds.length}).`
    )
  }

  const matchingIds = intersectIdsPreservingOrder(meiliIds, categoryIds)
  const totalCount = matchingIds.length
  const pagedIds = matchingIds.slice(offset, offset + limit)
  const products = await fetchProductsByIds({
    productIds: pagedIds,
    fields,
    region_id,
    country_code,
    signal,
  })

  return {
    products,
    count: totalCount,
    limit,
    offset,
  }
}

export async function fetchProductsViaMeiliAndCategoryAndVariantSearch(params: {
  query: string
  categories: string[]
  sizes: string[]
  limit: number
  offset: number
  fields: string
  region_id?: string
  country_code: string
  signal?: AbortSignal
}): Promise<RawProductListResponse> {
  const {
    query,
    categories,
    sizes,
    limit,
    offset,
    fields,
    region_id,
    country_code,
    signal,
  } = params

  // Trade-off: we collect all IDs before intersecting to keep deterministic ordering.
  const [meiliIds, categoryIds, sizeIds] = await Promise.all([
    collectMeiliProductIdsForQueryCached(query, signal),
    collectCategoryProductIdsCached({
      categories,
      region_id,
      country_code,
      signal,
    }),
    collectVariantProductIdsForSizes({ sizes, signal }),
  ])

  if (
    meiliIds.length > LARGE_ID_SET_WARNING_THRESHOLD ||
    categoryIds.length > LARGE_ID_SET_WARNING_THRESHOLD ||
    sizeIds.length > LARGE_ID_SET_WARNING_THRESHOLD
  ) {
    console.warn(
      `[ProductSearch] Large ID collections in MEILI_CATEGORY_SIZE_INTERSECTION (meili=${meiliIds.length}, categories=${categoryIds.length}, size=${sizeIds.length}).`
    )
  }

  const meiliCategoryIds = intersectIdsPreservingOrder(meiliIds, categoryIds)
  const matchingIds = intersectIdsPreservingOrder(meiliCategoryIds, sizeIds)
  const totalCount = matchingIds.length
  const pagedIds = matchingIds.slice(offset, offset + limit)
  const products = await fetchProductsByIds({
    productIds: pagedIds,
    fields,
    region_id,
    country_code,
    signal,
  })

  return {
    products,
    count: totalCount,
    limit,
    offset,
  }
}

export async function fetchProductsViaMeili(params: {
  query: string
  limit: number
  offset: number
  fields: string
  region_id?: string
  country_code: string
  signal?: AbortSignal
}): Promise<RawProductListResponse> {
  const { query, limit, offset, fields, region_id, country_code, signal } = params
  const hitsResponse = await fetchMeiliHits({ query, limit, offset, signal })

  const hits = hitsResponse.hits || []
  const productIds = dedupeIdsFromHits(hits)
  const pageOffset = hitsResponse.offset ?? offset
  const pageLimit = hitsResponse.limit ?? limit
  const observedCount = pageOffset + productIds.length
  const hasMoreByPageSize = hits.length >= pageLimit
  // estimatedTotalHits can be approximate; we keep UI count monotonic but bounded by observed pages.
  const totalCount = hasMoreByPageSize
    ? Math.max(hitsResponse.estimatedTotalHits ?? 0, observedCount)
    : observedCount

  const products = await fetchProductsByIds({
    productIds,
    fields,
    region_id,
    country_code,
    signal,
  })

  return {
    products,
    count: totalCount,
    limit: hitsResponse.limit ?? limit,
    offset: hitsResponse.offset ?? offset,
  }
}
