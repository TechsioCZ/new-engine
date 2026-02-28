import type { StoreProduct } from "@medusajs/types"
import { createProductHooks } from "@techsio/storefront-data/products/hooks"
import {
  type MedusaProductDetailInput,
} from "@techsio/storefront-data/products/medusa-service"
import type { ProductService } from "@techsio/storefront-data/products/types"
import {
  DEFAULT_COUNTRY_CODE,
  PRODUCT_DETAILED_FIELDS,
  PRODUCT_LIMIT,
  PRODUCT_LIST_FIELDS,
} from "@/lib/constants"
import { sdk } from "@/lib/medusa-client"
import {
  buildQueryString,
  buildProductQueryParams,
  type ProductQueryParams,
} from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"

export type ProductListInput = {
  category_id?: string[]
  q?: string
  page?: number
  limit?: number
  enabled?: boolean
  region_id?: string
  country_code?: string
}

export type ProductDetailInput = {
  handle: string
  fields?: string
  enabled?: boolean
  region_id?: string
  country_code?: string
}

type ProductListParams = ProductQueryParams
type ProductDetailParams = MedusaProductDetailInput

function buildListParams(input: ProductListInput): ProductListParams {
  return buildProductQueryParams(input)
}

function buildDetailParams(input: ProductDetailInput): ProductDetailParams {
  return {
    handle: input.handle,
    region_id: input.region_id,
    country_code: input.country_code ?? DEFAULT_COUNTRY_CODE,
    fields: input.fields,
  }
}

const productQueryKeys = {
  list: (params: ProductListParams) => queryKeys.products.list(params),
  detail: (params: ProductDetailParams) =>
    queryKeys.products.detail(
      params.handle,
      params.region_id ?? "",
      params.country_code ?? DEFAULT_COUNTRY_CODE
    ),
}

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

type ProductListResponse = {
  products: StoreProduct[]
  count: number
  limit: number
  offset: number
}

function parseSearchQuery(query: string | undefined): string | null {
  const normalized = query?.trim()
  return normalized ? normalized : null
}

async function fetchJson<T>(
  path: string,
  queryString: string,
  signal?: AbortSignal
): Promise<T> {
  const requestPath = queryString ? `${path}?${queryString}` : path
  return sdk.client.fetch<T>(requestPath, { signal })
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

async function fetchStoreProducts(
  params: ProductListParams,
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

  const data = await fetchJson<StoreProductsApiResponse>(
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
  params: ProductListParams,
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

  const hitsData = await fetchJson<MeiliSearchHitsResponse>(
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

  const productsData = await fetchJson<StoreProductsApiResponse>(
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

async function getProducts(
  params: ProductListParams,
  signal?: AbortSignal
): Promise<ProductListResponse> {
  const searchQuery = parseSearchQuery(params.q)
  const hasCategoryFilter = (params.category_id?.length ?? 0) > 0

  try {
    if (searchQuery && !hasCategoryFilter) {
      try {
        return await fetchSearchProducts(params, searchQuery, signal)
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error
        }

        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[ProductService] Meili search failed, falling back to store listing.",
            error
          )
        }
      }
    }

    return await fetchStoreProducts(params, signal)
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error
    }

    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch products: ${message}`)
  }
}

const productService: ProductService<
  StoreProduct,
  ProductListParams,
  ProductDetailParams
> = {
  getProducts,

  getProductsGlobal(params) {
    return getProducts(params, undefined)
  },

  async getProductByHandle(params) {
    const response = await sdk.store.product.list({
      handle: params.handle,
      limit: 1,
      fields: params.fields ?? PRODUCT_DETAILED_FIELDS,
      country_code: params.country_code ?? DEFAULT_COUNTRY_CODE,
      region_id: params.region_id,
      province: params.province,
      cart_id: params.cart_id,
    })

    return response.products?.[0] ?? null
  },
}

export const productHooks = createProductHooks<
  StoreProduct,
  ProductListInput,
  ProductListParams,
  ProductDetailInput,
  ProductDetailParams
>({
  service: productService,
  buildListParams,
  buildDetailParams,
  queryKeys: productQueryKeys,
  queryKeyNamespace: "n1",
  defaultPageSize: PRODUCT_LIMIT,
  requireRegion: true,
})
