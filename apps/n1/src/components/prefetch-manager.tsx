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
const usePrefetchManager = () => {
  const { prefetchRootCategories } = usePrefetchProducts()
  const { regionId } = useRegion()
  const pathname = usePathname()
  const hasPrefetched = useRef(false)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const shouldPrefetch =
      (regionId?.length ?? 0) > 0 &&
      !hasPrefetched.current &&
      !pathname.startsWith("/kategorie/")

    if (shouldPrefetch) {
      hasPrefetched.current = true
      timer = setTimeout(() => {
        prefetchLogger.info("Root", `Manager started from ${pathname}`)

        for (const categoryIds of Object.values(CATEGORY_MAP)) {
          void prefetchRootCategories(categoryIds)
        }
      }, PREFETCH_DELAY)
    }

    return () => {
      if (timer !== null) {
        clearTimeout(timer)
      }
    }
  }, [regionId, pathname, prefetchRootCategories])

  return null
}

export { usePrefetchManager as PrefetchManager }
