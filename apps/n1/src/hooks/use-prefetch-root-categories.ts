"use client"

import { useEffect, useRef } from "react"
import { getCategoryDescendantIds } from "@/lib/categories/selectors"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import {
  shouldResetPrefetchForRegion,
  shouldRunRootPrefetch,
} from "./prefetch-region"
import { useSuspenseCategoryRegistry } from "./use-category-registry"
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
  const categoryRegistry = useSuspenseCategoryRegistry()
  const { rootCategories } = categoryRegistry
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

      for (const category of rootCategories) {
        if (category.handle !== currentHandle) {
          prefetchRootCategories(
            getCategoryDescendantIds(categoryRegistry, category.id)
          )
        }
      }
    }, delay)

    return () => clearTimeout(timer)
  }, [
    enabled,
    regionId,
    currentHandle,
    delay,
    categoryRegistry,
    prefetchRootCategories,
    rootCategories,
  ])
}
