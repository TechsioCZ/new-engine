"use client"

import { useCallback } from "react"
import { storefront } from "@/lib/storefront"
import { buildProductDetailQuery } from "@/services/product-service"
import { useRegions } from "./use-region"

export function usePrefetchProduct(enabled?: boolean) {
  const { selectedRegion } = useRegions()
  const { prefetchProduct } = storefront.hooks.products.usePrefetchProduct({
    skipIfCached: true,
    skipMode: "any",
  })
  const enabledPrefetch = enabled ?? true

  return useCallback(
    (handle: string) => {
      if (!(enabledPrefetch && handle && selectedRegion?.id)) {
        return
      }

      return prefetchProduct(buildProductDetailQuery(handle, selectedRegion.id))
    },
    [enabledPrefetch, prefetchProduct, selectedRegion?.id]
  )
}
