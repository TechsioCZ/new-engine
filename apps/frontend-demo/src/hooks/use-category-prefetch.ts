import { useCallback, useEffect, useRef } from "react"
import type { CacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { useRegions } from "@/hooks/use-region"
import { useStorefrontPrefetchProducts } from "./storefront-products"

interface UseCategoryPrefetchOptions {
  enabled?: boolean
  cacheStrategy?: keyof CacheConfig
  prefetchLimit?: number // Custom limit for prefetch vs normal queries
}

export function useCategoryPrefetch(options?: UseCategoryPrefetchOptions) {
  const { selectedRegion } = useRegions()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
  const prefetchLimit = options?.prefetchLimit ?? 12
  const activePrefetchIdsRef = useRef<Set<string>>(new Set())
  const delayedPrefetchTimersRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map())

  const { prefetchProducts } = useStorefrontPrefetchProducts({
    cacheStrategy,
  })

  useEffect(() => {
    return () => {
      const pendingTimers = Array.from(delayedPrefetchTimersRef.current.values())
      for (const timer of pendingTimers) {
        clearTimeout(timer)
      }

      delayedPrefetchTimersRef.current.clear()
      activePrefetchIdsRef.current.clear()
    }
  }, [])

  const clearPrefetchTimer = useCallback((prefetchId: string) => {
    const timer = delayedPrefetchTimersRef.current.get(prefetchId)
    if (timer) {
      clearTimeout(timer)
      delayedPrefetchTimersRef.current.delete(prefetchId)
    }
  }, [])

  const prefetchCategoryProducts = useCallback(
    async (categoryIds: string[]) => {
      if (!(enabled && selectedRegion?.id) || categoryIds.length === 0) {
        return
      }

      await prefetchProducts(
        {
          page: 1,
          limit: prefetchLimit,
          filters: { categories: categoryIds, sizes: [] },
          region_id: selectedRegion.id,
          sort: "newest",
        },
        {
          cacheStrategy,
          skipIfCached: true,
          skipMode: "fresh",
          prefetchedBy: "category-tree",
        }
      )
    },
    [cacheStrategy, enabled, prefetchLimit, prefetchProducts, selectedRegion?.id]
  )

  const delayedPrefetch = useCallback(
    (categoryIds: string[], delay = 800, prefetchId?: string) => {
      const id = prefetchId || `prefetch_${Date.now()}_${Math.random()}`
      if (!(enabled && selectedRegion?.id) || categoryIds.length === 0) {
        return id
      }

      activePrefetchIdsRef.current.add(id)
      clearPrefetchTimer(id)

      const timer = setTimeout(() => {
        delayedPrefetchTimersRef.current.delete(id)
        void prefetchProducts(
          {
            page: 1,
            limit: prefetchLimit,
            filters: { categories: categoryIds, sizes: [] },
            region_id: selectedRegion.id,
            sort: "newest",
          },
          {
            cacheStrategy,
            skipIfCached: true,
            skipMode: "fresh",
            prefetchedBy: "category-tree",
          }
        )
          .catch((error) => {
            console.warn("Category delayed prefetch failed", {
              error,
              categoryIds,
            })
          })
          .finally(() => {
            activePrefetchIdsRef.current.delete(id)
          })
      }, delay)

      delayedPrefetchTimersRef.current.set(id, timer)
      return id
    },
    [
      cacheStrategy,
      clearPrefetchTimer,
      enabled,
      prefetchLimit,
      prefetchProducts,
      selectedRegion?.id,
    ]
  )

  const cancelPrefetch = useCallback(
    (prefetchId: string) => {
      const exists = activePrefetchIdsRef.current.has(prefetchId)
      clearPrefetchTimer(prefetchId)
      activePrefetchIdsRef.current.delete(prefetchId)
      return exists
    },
    [clearPrefetchTimer]
  )

  const cancelAllPrefetches = useCallback(() => {
    const pendingTimers = Array.from(delayedPrefetchTimersRef.current.values())
    for (const timer of pendingTimers) {
      clearTimeout(timer)
    }
    delayedPrefetchTimersRef.current.clear()
    activePrefetchIdsRef.current.clear()
  }, [])

  return {
    prefetchCategoryProducts,
    delayedPrefetch,
    cancelPrefetch,
    cancelAllPrefetches,
  }
}
