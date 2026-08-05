import type { StoreProduct } from "@medusajs/types"

import { PRODUCT_DETAILED_FIELDS } from "@/lib/constants"
import { fetchLogger } from "@/lib/loggers/fetch"
import { getMedusaBackendUrl } from "@/lib/medusa-backend-url"
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

export async function getProducts(
  params: ProductQueryParams,
  signal?: AbortSignal
): Promise<ProductListResponse> {
  const { category_id, region_id, country_code, limit, offset, fields } = params

  try {
    const queryString = buildQueryString({
      limit,
      offset,
      fields,
      ...(country_code ? { country_code } : {}),
      ...(region_id ? { region_id } : {}),
      category_id,
    })

    // Use native fetch with Medusa headers for AbortSignal support
    const baseUrl = getMedusaBackendUrl()
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

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

    const data = await response.json()

    return {
      count: data.count || 0,
      limit: limit || 0,
      offset: offset || 0,
      products: data.products || [],
    }
  } catch (error) {
    const isAbortError = error instanceof Error && error.name === "AbortError"
    // Next rejects in-flight fetches once a prerender completes. It tags those
    // with a stable digest, which is what Next's own
    // isHangingPromiseRejectionError checks, so classify on that rather than on
    // the human-readable message.
    const isPrerenderCompletionError =
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      error.digest === "HANGING_PROMISE_REJECTION"

    // Request cancellations are expected (navigation, Suspense and prerender
    // completion). Return empty data so the UI can continue and client queries
    // can refetch.
    if (signal?.aborted || isAbortError || isPrerenderCompletionError) {
      if (process.env.NODE_ENV === "development") {
        const categoryLabel = category_id?.[0]?.slice(-6) || "all"
        fetchLogger.cancelled(categoryLabel, offset)
      }

      return {
        products: [],
        count: 0,
        limit: limit || 0,
        offset: offset || 0,
      }
    }

    if (process.env.NODE_ENV === "development") {
      console.error("[ProductService] Failed to fetch products:", error)
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch products: ${message}`, { cause: err })
  }
}

/**
 * Fetch products without AbortSignal (for global/persistent prefetch)
 * Use for root categories that should complete even after navigation
 */
export async function getProductsGlobal(
  params: ProductQueryParams
): Promise<ProductListResponse> {
  return getProducts(params)
}

export async function getProductByHandle(
  params: ProductDetailParams
): Promise<StoreProduct | null> {
  const { handle, region_id, country_code } = params

  try {
    const response = await sdk.store.product.list({
      fields: PRODUCT_DETAILED_FIELDS,
      handle,
      limit: 1,
      ...(country_code ? { country_code } : {}),
      ...(region_id ? { region_id } : {}),
    })

    return response.products?.[0] || null
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error(
        "[ProductService] Failed to fetch product by handle:",
        error
      )
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    throw new Error(`Failed to fetch product: ${message}`, { cause: err })
  }
}
