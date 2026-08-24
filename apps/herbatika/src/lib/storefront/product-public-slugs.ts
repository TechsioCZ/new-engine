"use client"

import type { HttpTypes } from "@medusajs/types"
import { useQuery } from "@tanstack/react-query"
import { createQueryKey } from "@techsio/storefront-data/shared/query-keys"
import {
  isValidProductSourceId,
  PRODUCT_PUBLIC_SLUGS_GATEWAY_PATH,
  PRODUCT_PUBLIC_SLUGS_MAX_IDS,
  type ProductPublicSlugsResponse,
  parseProductPublicSlugsResponse,
} from "./product-public-slugs-contract"
import { storefrontDefinition } from "./storefront-definition"

type PublicSlugMap = Readonly<Record<string, string>>

class ProductPublicSlugsRequestError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Product public slugs request failed with status ${status}`)
    this.name = "ProductPublicSlugsRequestError"
    this.status = status
  }
}

export async function fetchProductPublicSlugs(
  productIds: readonly string[],
  signal?: AbortSignal
): Promise<ProductPublicSlugsResponse> {
  const query = new URLSearchParams({ ids: productIds.join(",") })
  const response = await fetch(
    PRODUCT_PUBLIC_SLUGS_GATEWAY_PATH.concat("?", query.toString()),
    {
      credentials: "same-origin",
      headers: { accept: "application/json" },
      signal,
    }
  )

  if (!response.ok) {
    throw new ProductPublicSlugsRequestError(response.status)
  }

  const payload: unknown = await response.json()

  return parseProductPublicSlugsResponse(payload)
}

const handleFallbackMap = (
  products: readonly HttpTypes.StoreProduct[]
): PublicSlugMap =>
  Object.fromEntries(
    products.flatMap((product) =>
      product.id && product.handle ? [[product.id, product.handle]] : []
    )
  )

/**
 * Resolves public URL slugs for client-fetched products (related products,
 * recently visited, recommendations) that the SSR projection map cannot cover.
 * Slugs already present in `knownSlugsById` are never re-requested.
 */
export const useProductPublicSlugs = (
  products: readonly HttpTypes.StoreProduct[],
  knownSlugsById: PublicSlugMap = {}
): PublicSlugMap => {
  const missingIds = [
    ...new Set(
      products.flatMap((product) =>
        product.id &&
        !knownSlugsById[product.id] &&
        isValidProductSourceId(product.id)
          ? [product.id]
          : []
      )
    ),
  ]
    .sort()
    .slice(0, PRODUCT_PUBLIC_SLUGS_MAX_IDS)

  const query = useQuery({
    queryKey: createQueryKey(
      storefrontDefinition.namespace,
      "product-public-slugs",
      { ids: missingIds }
    ),
    queryFn: ({ signal }) => fetchProductPublicSlugs(missingIds, signal),
    enabled: missingIds.length > 0,
    ...storefrontDefinition.cacheConfig.semiStatic,
  })

  if (!query.data) {
    return knownSlugsById
  }

  const fetchedSlugsById =
    query.data.mode === "handles"
      ? handleFallbackMap(products)
      : query.data.slugs_by_id

  return { ...fetchedSlugsById, ...knownSlugsById }
}
