"use client"

import { useCallback } from "react"
import { storefront } from "@/lib/storefront"
import { buildProductDetailQuery } from "@/services/product-service"

export function usePrefetchProduct(enabled?: boolean) {
  const { prefetchProduct } = storefront.hooks.products.usePrefetchProduct({
    skipIfCached: true,
    skipMode: "any",
  })
  const enabledPrefetch = enabled ?? true

  return useCallback(
    (handle: string) => {
      if (!(enabledPrefetch && handle)) {
        return
      }

      return prefetchProduct(buildProductDetailQuery(handle))
    },
    [enabledPrefetch, prefetchProduct]
  )
}
