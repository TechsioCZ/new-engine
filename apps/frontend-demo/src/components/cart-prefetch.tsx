"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useEffect } from "react"
import { useStorefrontPrefetchCart } from "@/hooks/storefront-cart"

export function CartPrefetch() {
  const region = useRegionContext()
  const { prefetchCart } = useStorefrontPrefetchCart({
    cacheStrategy: "realtime",
    skipIfCached: true,
    skipMode: "fresh",
  })

  useEffect(() => {
    if (!region?.region_id) return
    void prefetchCart({
      autoCreate: true,
      autoUpdateRegion: true,
    })
  }, [prefetchCart, region?.region_id, region?.country_code])

  return null
}
