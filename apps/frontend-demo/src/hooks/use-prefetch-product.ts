import { useCallback } from "react"
import { useRegions } from "@/hooks/use-region"
import { useStorefrontPrefetchProduct } from "./storefront-products"

export function usePrefetchProduct(enabled?: boolean) {
  const { selectedRegion } = useRegions()
  const enabledPrefetch = enabled ?? true
  const { prefetchProduct } = useStorefrontPrefetchProduct({
    cacheStrategy: "semiStatic",
  })

  return useCallback(
    (handle: string) => {
      if (!enabledPrefetch) {
        return
      }

      void prefetchProduct({
        handle,
        region_id: selectedRegion?.id,
      })
    },
    [selectedRegion?.id, enabledPrefetch, prefetchProduct]
  )
}
