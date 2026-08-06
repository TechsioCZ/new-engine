"use client"

import { useEffect, useRef } from "react"

import { CATEGORY_MAP } from "@/lib/constants"
import { prefetchLogger } from "@/lib/loggers/prefetch"

import { usePrefetchProducts } from "./use-prefetch-products"
import { useRegion } from "./use-region"

interface UsePrefetchRootCategoriesParams {
  enabled?: boolean
  currentHandle: string
  delay?: number
}

export const usePrefetchRootCategories = ({
  enabled = true,
  currentHandle,
  delay = 200,
}: UsePrefetchRootCategoriesParams) => {
  const { regionId } = useRegion()
  const { prefetchRootCategories } = usePrefetchProducts()
  const hasPrefetched = useRef(false)

  useEffect(() => {
    const hasRegion =
      regionId !== undefined && regionId !== null && regionId !== ""
    if (!enabled || !hasRegion || hasPrefetched.current) {
      return () => {
        // No resources were allocated.
      }
    }

    hasPrefetched.current = true

    const timer = setTimeout(() => {
      prefetchLogger.info(
        "Root",
        `Prefetching other root from /kategorie/${currentHandle}`,
      )

      for (const [handle, categoryIds] of Object.entries(CATEGORY_MAP)) {
        if (handle !== currentHandle) {
          void prefetchRootCategories(categoryIds)
        }
      }
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [enabled, regionId, currentHandle, delay, prefetchRootCategories])
}
