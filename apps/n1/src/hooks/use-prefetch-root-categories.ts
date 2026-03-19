"use client"

import { useEffect, useRef } from "react"
import { CATEGORY_MAP } from "@/lib/constants"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import {
  shouldResetPrefetchForRegion,
  shouldRunRootPrefetch,
} from "./prefetch-region"
import { usePrefetchProducts } from "./use-prefetch-products"
import { useRegion } from "./use-region"

type UsePrefetchRootCategoriesParams = {
  enabled?: boolean
  currentHandle: string
  delay?: number
}

export function usePrefetchRootCategories({
  enabled = true,
  currentHandle,
  delay = PREFETCH_DELAYS.ROOT_CATEGORIES,
}: UsePrefetchRootCategoriesParams) {
  const { regionId } = useRegion()
  const { prefetchRootCategories } = usePrefetchProducts()
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
      !shouldRunRootPrefetch({
        enabled,
        regionId,
        hasPrefetched: hasPrefetched.current,
      })
    ) {
      return
    }

    hasPrefetched.current = true

    const timer = setTimeout(() => {
      prefetchLogger.info(
        "Root",
        `Prefetching other root from /kategorie/${currentHandle}`
      )

      for (const [handle, categoryIds] of Object.entries(CATEGORY_MAP)) {
        if (handle !== currentHandle) {
          prefetchRootCategories(categoryIds)
        }
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [enabled, regionId, currentHandle, delay, prefetchRootCategories])
}
