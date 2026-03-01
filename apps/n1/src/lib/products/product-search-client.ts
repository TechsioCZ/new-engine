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

function parseSearchQuery(query: string | undefined): string | null {
  const normalized = query?.trim()
  return normalized ? normalized : null
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

    return await fetchStoreProducts(params, signal)
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch products: ${message}`)
  }
}
