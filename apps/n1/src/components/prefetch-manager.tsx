"use client"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { usePrefetchProducts } from "@/hooks/use-prefetch-products"
import {
  shouldResetPrefetchForRegion,
  shouldRunPrefetchManager,
} from "@/hooks/prefetch-region"
import { useRegion } from "@/hooks/use-region"
import { CATEGORY_MAP } from "@/lib/constants"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"

/**
 * Prefetches all root categories only on homepage
 * Category pages use usePrefetchRootCategories hook instead.
 */
export function PrefetchManager() {
  const { prefetchRootCategories } = usePrefetchProducts()
  const { regionId } = useRegion()
  const pathname = usePathname() ?? "/"
  const hasPrefetched = useRef(false)
  const prefetchedRegionId = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (shouldResetPrefetchForRegion(prefetchedRegionId.current, regionId)) {
      hasPrefetched.current = false
      prefetchedRegionId.current = regionId
    }
  }, [regionId])

  useEffect(() => {
    if (
      !shouldRunPrefetchManager({
        pathname,
        regionId,
        hasPrefetched: hasPrefetched.current,
      })
    ) {
      return
    }

    hasPrefetched.current = true

    const timer = setTimeout(() => {
      prefetchLogger.info("Root", `Manager started from ${pathname}`)

      // Prefetch ALL root categories (without AbortSignal)
      for (const categoryIds of Object.values(CATEGORY_MAP)) {
        prefetchRootCategories(categoryIds)
      }
    }, PREFETCH_DELAYS.ROOT_CATEGORIES)

    return () => clearTimeout(timer)
  }, [regionId, pathname, prefetchRootCategories])

  return null
}
