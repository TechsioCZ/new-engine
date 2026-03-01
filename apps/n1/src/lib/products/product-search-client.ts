import type { StoreProduct } from "@medusajs/types"
import {
  DEFAULT_COUNTRY_CODE,
  PRODUCT_LIST_FIELDS,
} from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import {
  buildQueryString,
  type ProductQueryParams,
} from "@/lib/product-query-params"

type StoreProductsApiResponse = {
  products?: StoreProduct[]
  count?: number
  limit?: number
  offset?: number
}

type MeiliSearchProductHit = {
  id?: string
}

type MeiliSearchHitsResponse = {
  hits?: MeiliSearchProductHit[]
  estimatedTotalHits?: number
  limit?: number
  offset?: number
}

export type ProductListResponse = {
  products: StoreProduct[]
  count: number
  limit: number
  offset: number
}

type ProductFetchOptions = {
  logPrefix?: string
}

const CATEGORY_SEARCH_RESCUE_MATCH_RATIO = 4
const CATEGORY_SEARCH_RESCUE_HITS_BATCH_LIMIT = 120
const CATEGORY_SEARCH_RESCUE_PRODUCTS_BATCH_LIMIT = 24
const CATEGORY_SEARCH_RESCUE_MIN_HITS_SCAN = 160
const CATEGORY_SEARCH_RESCUE_MAX_HITS_SCAN = 1200

function parseSearchQuery(query: string | undefined): string | null {
  const normalized = query?.trim()
  return normalized ? normalized : null
}

function toSafeNonNegativeNumber(value: number | undefined): number {
  if (!(typeof value === "number" && Number.isFinite(value) && value >= 0)) {
    return 0
  }

  return Math.floor(value)
}

function resolveCategorySearchRescueHitsScanLimit(
  limit: number | undefined,
  offset: number | undefined
): number {
  const safeLimit = Math.max(toSafeNonNegativeNumber(limit), 1)
  const safeOffset = toSafeNonNegativeNumber(offset)
  const requiredWindow = safeOffset + safeLimit + 1
  const target = requiredWindow * CATEGORY_SEARCH_RESCUE_MATCH_RATIO

  return Math.min(
    CATEGORY_SEARCH_RESCUE_MAX_HITS_SCAN,
    Math.max(CATEGORY_SEARCH_RESCUE_MIN_HITS_SCAN, target)
  )
}

async function fetchCategoryProductsByIds(
  ids: string[],
  {
    category_id,
    region_id,
    country_code,
    fields,
  }: {
    category_id: string[]
    region_id?: string
    country_code: string
    fields: string
  },
  signal?: AbortSignal
): Promise<StoreProduct[]> {
  const productsById = new Map<string, StoreProduct>()

  for (
    let start = 0;
    start < ids.length;
    start += CATEGORY_SEARCH_RESCUE_PRODUCTS_BATCH_LIMIT
  ) {
    const idChunk = ids.slice(
      start,
      start + CATEGORY_SEARCH_RESCUE_PRODUCTS_BATCH_LIMIT
    )
    if (idChunk.length === 0) {
      continue
    }

    const productsQueryString = buildQueryString({
      id: idChunk,
      category_id,
      fields,
      region_id,
      country_code,
      limit: idChunk.length,
      offset: 0,
    })

    const productsData = await fetchStoreJson<StoreProductsApiResponse>(
      "/store/products",
      productsQueryString,
      signal
    )

    for (const product of productsData.products ?? []) {
      if (!product?.id || productsById.has(product.id)) {
        continue
      }

      productsById.set(product.id, product)
    }
  }

  return Array.from(productsById.values())
}

function dedupeIdsFromHits(hits: MeiliSearchProductHit[] | undefined): string[] {
  const ids: string[] = []
  const seen = new Set<string>()

  for (const hit of hits ?? []) {
    const id = hit.id?.trim()
    if (!id || seen.has(id)) {
      continue
    }

    seen.add(id)
    ids.push(id)
  }

  return ids
}

function orderProductsByIds(products: StoreProduct[], ids: string[]): StoreProduct[] {
  const byId = new Map(products.map((product) => [product.id, product]))

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is StoreProduct => Boolean(product))
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError"
}

export async function fetchStoreJson<T>(
  path: string,
  queryString: string,
  signal?: AbortSignal
): Promise<T> {
  const requestPath = queryString ? `${path}?${queryString}` : path
  return sdk.client.fetch<T>(requestPath, { signal })
}

async function fetchStoreProducts(
  params: ProductQueryParams,
  signal?: AbortSignal
): Promise<ProductListResponse> {
  const {
    q,
    category_id,
    region_id,
    country_code = DEFAULT_COUNTRY_CODE,
    limit,
    offset,
    fields = PRODUCT_LIST_FIELDS,
  } = params

  const queryString = buildQueryString({
    q,
    category_id,
    region_id,
    country_code,
    limit,
    offset,
    fields,
  })

  const data = await fetchStoreJson<StoreProductsApiResponse>(
    "/store/products",
    queryString,
    signal
  )

  return {
    products: data.products ?? [],
    count: data.count ?? 0,
    limit: data.limit ?? limit ?? 0,
    offset: data.offset ?? offset ?? 0,
  }
}

async function fetchCategorySearchRescueProducts(
  params: ProductQueryParams,
  searchQuery: string,
  signal?: AbortSignal
): Promise<ProductListResponse> {
  const {
    category_id = [],
    region_id,
    country_code = DEFAULT_COUNTRY_CODE,
    limit,
    offset,
    fields = PRODUCT_LIST_FIELDS,
  } = params
  const pageLimit = Math.max(toSafeNonNegativeNumber(limit), 1)
  const pageOffset = toSafeNonNegativeNumber(offset)
  const requiredMatches = pageOffset + pageLimit + 1
  const maxHitsToScan = resolveCategorySearchRescueHitsScanLimit(
    pageLimit,
    pageOffset
  )
  const matchedIds: string[] = []
  const matchedIdSet = new Set<string>()
  const allMatchedProducts = new Map<string, StoreProduct>()
  const processedIds = new Set<string>()
  let hitsOffset = 0
  let scannedHits = 0
  let hasMoreHits = true
  let estimatedTotalHits = 0

  while (
    hasMoreHits &&
    scannedHits < maxHitsToScan &&
    matchedIds.length < requiredMatches
  ) {
    const remainingHitsBudget = maxHitsToScan - scannedHits
    const hitsLimit = Math.min(
      CATEGORY_SEARCH_RESCUE_HITS_BATCH_LIMIT,
      remainingHitsBudget
    )
    if (hitsLimit <= 0) {
      break
    }

    const hitsQueryString = buildQueryString({
      query: searchQuery,
      limit: hitsLimit,
      offset: hitsOffset,
    })

    const hitsData = await fetchStoreJson<MeiliSearchHitsResponse>(
      "/store/meilisearch/products-hits",
      hitsQueryString,
      signal
    )

    estimatedTotalHits = Math.max(
      estimatedTotalHits,
      toSafeNonNegativeNumber(hitsData.estimatedTotalHits)
    )

    const rawHitIds = dedupeIdsFromHits(hitsData.hits)
    const newHitIds = rawHitIds.filter((id) => {
      if (processedIds.has(id)) {
        return false
      }

      processedIds.add(id)
      return true
    })

    if (newHitIds.length > 0) {
      const batchProducts = await fetchCategoryProductsByIds(
        newHitIds,
        {
          category_id,
          region_id,
          country_code,
          fields,
        },
        signal
      )

      for (const product of batchProducts) {
        if (!product?.id || allMatchedProducts.has(product.id)) {
          continue
        }

        allMatchedProducts.set(product.id, product)
      }

      for (const id of newHitIds) {
        if (!allMatchedProducts.has(id) || matchedIdSet.has(id)) {
          continue
        }

        matchedIds.push(id)
        matchedIdSet.add(id)
      }
    }

    const receivedHits = hitsData.hits?.length ?? 0
    scannedHits += receivedHits
    hitsOffset += receivedHits

    const reachedEstimatedEnd =
      estimatedTotalHits > 0 && hitsOffset >= estimatedTotalHits
    hasMoreHits = receivedHits === hitsLimit && !reachedEstimatedEnd

    if (receivedHits === 0) {
      break
    }
  }

  const orderedProducts = orderProductsByIds(
    Array.from(allMatchedProducts.values()),
    matchedIds
  )
  const paginatedProducts = orderedProducts.slice(
    pageOffset,
    pageOffset + pageLimit
  )
  const observedCount = orderedProducts.length
  const hasPotentialMoreMatches =
    hasMoreHits || (estimatedTotalHits > 0 && scannedHits < estimatedTotalHits)
  const countFloor =
    pageOffset +
    paginatedProducts.length +
    (paginatedProducts.length === pageLimit && hasPotentialMoreMatches ? 1 : 0)
  const totalCount = hasPotentialMoreMatches
    ? Math.max(observedCount, countFloor)
    : observedCount

  return {
    products: paginatedProducts,
    count: totalCount,
    limit: pageLimit,
    offset: pageOffset,
  }
}

async function fetchSearchProducts(
  params: ProductQueryParams,
  searchQuery: string,
  signal?: AbortSignal
): Promise<ProductListResponse> {
  const {
    region_id,
    country_code = DEFAULT_COUNTRY_CODE,
    limit,
    offset,
    fields = PRODUCT_LIST_FIELDS,
  } = params

  const hitsQueryString = buildQueryString({
    query: searchQuery,
    limit,
    offset,
  })

  const hitsData = await fetchStoreJson<MeiliSearchHitsResponse>(
    "/store/meilisearch/products-hits",
    hitsQueryString,
    signal
  )

  const hits = hitsData.hits ?? []
  const productIds = dedupeIdsFromHits(hits)
  const pageOffset = hitsData.offset ?? offset ?? 0
  const pageLimit = hitsData.limit ?? limit ?? hits.length
  const observedCount = pageOffset + productIds.length
  const hasMoreByPageSize = pageLimit > 0 && hits.length >= pageLimit
  const totalCount =
    typeof hitsData.estimatedTotalHits === "number"
      ? Math.max(hitsData.estimatedTotalHits, observedCount)
      : hasMoreByPageSize
        ? Math.max(observedCount, pageOffset + pageLimit + 1)
        : observedCount

  if (productIds.length === 0) {
    return {
      products: [],
      count: totalCount,
      limit: pageLimit,
      offset: pageOffset,
    }
  }

  const productsQueryString = buildQueryString({
    id: productIds,
    fields,
    region_id,
    country_code,
    limit: productIds.length,
    offset: 0,
  })

  const productsData = await fetchStoreJson<StoreProductsApiResponse>(
    "/store/products",
    productsQueryString,
    signal
  )

  return {
    products: orderProductsByIds(productsData.products ?? [], productIds),
    count: totalCount,
    limit: pageLimit,
    offset: pageOffset,
  }
}

export async function getProductsWithMeiliFallback(
  params: ProductQueryParams,
  signal?: AbortSignal,
  options?: ProductFetchOptions
): Promise<ProductListResponse> {
  const searchQuery = parseSearchQuery(params.q)
  const hasCategoryFilter = (params.category_id?.length ?? 0) > 0
  const logPrefix = options?.logPrefix ?? "[ProductService]"

  try {
    if (searchQuery && !hasCategoryFilter) {
      try {
        return await fetchSearchProducts(params, searchQuery, signal)
      } catch (error) {
        if (isAbortError(error)) {
          throw error
        }

        if (process.env.NODE_ENV === "development") {
          console.warn(
            `${logPrefix} Meili search failed, falling back to store listing.`,
            error
          )
        }
      }
    }

    if (searchQuery && hasCategoryFilter) {
      const storeResult = await fetchStoreProducts(params, signal)
      if (storeResult.count > 0) {
        return storeResult
      }

      try {
        const rescueResult = await fetchCategorySearchRescueProducts(
          params,
          searchQuery,
          signal
        )
        if (rescueResult.count > 0 || rescueResult.products.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.info(
              `${logPrefix} Category search typo rescue activated.`,
              {
                query: searchQuery,
                categoryCount: params.category_id?.length ?? 0,
                rescuedCount: rescueResult.count,
              }
            )
          }

          return rescueResult
        }
      } catch (error) {
        if (isAbortError(error)) {
          throw error
        }

        if (process.env.NODE_ENV === "development") {
          console.warn(
            `${logPrefix} Category search typo rescue failed, keeping store result.`,
            error
          )
        }
      }

      return storeResult
    }

    return await fetchStoreProducts(params, signal)
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch products: ${message}`)
  }
}
