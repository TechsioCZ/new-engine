"use client"
import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import { usePrefetchProducts } from "@/hooks/use-prefetch-products"
import { useRegion } from "@/hooks/use-region"
import { CATEGORY_MAP } from "@/lib/constants"
import { prefetchLogger } from "@/lib/loggers/prefetch"

const PREFETCH_DELAY = 200

/**
 * Prefetches all root categories on non-category pages
 * Category pages use usePrefetchRootCategories hook instead
 */
export function PrefetchManager() {
  const { prefetchRootCategories } = usePrefetchProducts()
  const { regionId } = useRegion()
  const pathname = usePathname()
  const hasPrefetched = useRef(false)

  useEffect(() => {
    if (!regionId) {
      return
    }
    if (hasPrefetched.current) {
      return
    }

    // Skip category pages - they have their own prefetch logic
    if (pathname.startsWith("/kategorie/")) {
      return
    }

    hasPrefetched.current = true

    const timer = setTimeout(() => {
      prefetchLogger.info("Root", `Manager started from ${pathname}`)

      // Prefetch ALL root categories (without AbortSignal)
      for (const categoryIds of Object.values(CATEGORY_MAP)) {
        void prefetchRootCategories(categoryIds)
      }
    }, PREFETCH_DELAY)

    return () => clearTimeout(timer)
  }, [regionId, pathname, prefetchRootCategories])

  return null
}
