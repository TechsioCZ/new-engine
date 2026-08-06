import type { StoreProduct } from "@medusajs/types"

import { PRODUCT_DETAILED_FIELDS } from "@/lib/constants"
import { fetchLogger } from "@/lib/loggers/fetch"
import {
  getMedusaBackendUrl,
  getMedusaPublishableKey,
} from "@/lib/medusa-backend-url"
import { sdk } from "@/lib/medusa-client"
import { buildQueryString } from "@/lib/product-query-params"
import type { ProductQueryParams } from "@/lib/product-query-params"

export interface ProductListResponse {
  products: StoreProduct[]
  count: number
  limit: number
  offset: number
}

export interface ProductDetailParams {
  handle: string
  region_id?: string
  country_code?: string
  fields?: string
}

interface GetProductsErrorContext {
  category_id?: string[] | undefined
  limit?: number | undefined
  offset?: number | undefined
  signal?: AbortSignal | undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const isStoreProductArray = (value: unknown): value is StoreProduct[] =>
  Array.isArray(value)

const readProductListPayload = (
  value: unknown,
): { count: number; products: StoreProduct[] } => {
  if (!isRecord(value)) {
    return { count: 0, products: [] }
  }

  const { count, products } = value

  return {
    count: typeof count === "number" ? count : 0,
    products: isStoreProductArray(products) ? products : [],
  }
}

const buildProductsQueryString = (params: ProductQueryParams): string => {
  const { category_id, country_code, fields, limit, offset, region_id } = params

  return buildQueryString({
    category_id,
    ...(country_code !== undefined && country_code.length > 0
      ? { country_code }
      : {}),
    fields,
    limit,
    offset,
    ...(region_id !== undefined && region_id.length > 0 ? { region_id } : {}),
  })
}

// Next rejects in-flight fetches once a prerender completes. It tags those
// with a stable digest, which is what Next's own
// isHangingPromiseRejectionError checks, so classify on that rather than on
// the human-readable message.
const isPrerenderCompletionError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "digest" in error &&
  error.digest === "HANGING_PROMISE_REJECTION"

const handleGetProductsError = (
  error: unknown,
  context: GetProductsErrorContext,
): ProductListResponse => {
  const { category_id, limit, offset, signal } = context
  const isAbortError = error instanceof Error && error.name === "AbortError"

  // Request cancellations are expected (navigation, Suspense and prerender
  // completion). Return empty data so the UI can continue and client queries
  // can refetch.
  if (
    signal?.aborted === true ||
    isAbortError ||
    isPrerenderCompletionError(error)
  ) {
    if (process.env.NODE_ENV === "development") {
      const categorySlice = category_id?.[0]?.slice(-6)
      const categoryLabel =
        categorySlice !== undefined && categorySlice.length > 0
          ? categorySlice
          : "all"
      fetchLogger.cancelled(categoryLabel, offset)
    }

    return {
      count: 0,
      limit: limit ?? 0,
      offset: offset ?? 0,
      products: [],
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.error("[ProductService] Failed to fetch products:", error)
  }
  const message = error instanceof Error ? error.message : "Unknown error"
  throw new Error(`Failed to fetch products: ${message}`, { cause: error })
}

export const getProducts = async (
  params: ProductQueryParams,
  signal?: AbortSignal,
): Promise<ProductListResponse> => {
  const { category_id, limit, offset } = params

  try {
    const queryString = buildProductsQueryString(params)

    // Use native fetch with Medusa headers for AbortSignal support
    const baseUrl = getMedusaBackendUrl()
    const publishableKey = getMedusaPublishableKey()

    const response = await fetch(`${baseUrl}/store/products?${queryString}`, {
      ...(signal ? { signal } : {}),
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": publishableKey,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data: unknown = await response.json()
    const payload = readProductListPayload(data)

    return {
      count: payload.count,
      limit: limit ?? 0,
      offset: offset ?? 0,
      products: payload.products,
    }
  } catch (error) {
    return handleGetProductsError(error, { category_id, limit, offset, signal })
  }
}

/**
 * Fetch products without AbortSignal (for global/persistent prefetch)
 * Use for root categories that should complete even after navigation
 */
export const getProductsGlobal = async (
  params: ProductQueryParams,
): Promise<ProductListResponse> => await getProducts(params)

export const getProductByHandle = async (
  params: ProductDetailParams,
): Promise<StoreProduct | null> => {
  const { handle, region_id, country_code } = params

  try {
    const response = await sdk.store.product.list({
      fields: PRODUCT_DETAILED_FIELDS,
      handle,
      limit: 1,
      ...(country_code !== undefined && country_code.length > 0
        ? { country_code }
        : {}),
      ...(region_id !== undefined && region_id.length > 0 ? { region_id } : {}),
    })

    return response.products?.[0] ?? null
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[ProductService] Failed to fetch product by handle:",
        error,
      )
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch product: ${message}`, { cause: error })
  }
}
