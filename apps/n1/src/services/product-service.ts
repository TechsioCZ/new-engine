import type { StoreProduct } from "@medusajs/types"
import { PRODUCT_DETAILED_FIELDS } from "@/lib/constants"
import { fetchLogger } from "@/lib/loggers/fetch"
import { getMedusaBackendUrl } from "@/lib/medusa-backend-url"
import { sdk } from "@/lib/medusa-client"
import {
  buildQueryString,
  type ProductQueryParams,
} from "@/lib/product-query-params"

export type ProductListResponse = {
  products: StoreProduct[]
  count: number
  limit: number
  offset: number
}

export type ProductDetailParams = {
  handle: string
  region_id?: string
  country_code?: string
  fields?: string
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: product fetch includes error handling and logging branches
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
      country_code,
      region_id,
      category_id,
    })

    // Use native fetch with Medusa headers for AbortSignal support
    const baseUrl = getMedusaBackendUrl()
    const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

    const response = await fetch(`${baseUrl}/store/products?${queryString}`, {
      signal,
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
      products: data.products || [],
      count: data.count || 0,
      limit: limit || 0,
      offset: offset || 0,
    }
  } catch (err) {
    const isAbortError = err instanceof Error && err.name === "AbortError"
    const isPrerenderAbortError =
      err instanceof Error &&
      err.message.includes(
        "During prerendering, fetch() rejects when the prerender is complete"
      )

    // Request cancellations are expected (navigation, Suspense/prerender completion).
    // Return empty data so the UI can continue and client queries can refetch.
    if (signal?.aborted || isAbortError || isPrerenderAbortError) {
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
      console.error("[ProductService] Failed to fetch products:", err)
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new Error(`Failed to fetch products: ${message}`)
  }
}

/**
 * Fetch products without AbortSignal (for global/persistent prefetch)
 * Use for root categories that should complete even after navigation
 */
export function getProductsGlobal(
  params: ProductQueryParams
): Promise<ProductListResponse> {
  return getProducts(params, undefined)
}

export async function getProductByHandle(
  params: ProductDetailParams
): Promise<StoreProduct | null> {
  const { handle, region_id, country_code } = params

  try {
    const response = await sdk.store.product.list({
      handle,
      limit: 1,
      fields: PRODUCT_DETAILED_FIELDS,
      country_code,
      region_id,
    })

    return response.products?.[0] || null
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ProductService] Failed to fetch product by handle:", err)
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    throw new Error(`Failed to fetch product: ${message}`)
  }
}
