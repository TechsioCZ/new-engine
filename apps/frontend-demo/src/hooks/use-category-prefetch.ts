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
  const cleanupTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  )
  const {
    prefetchProducts,
    delayedPrefetch: delayedStorefrontPrefetch,
    cancelPrefetch: cancelStorefrontPrefetch,
  } = useStorefrontPrefetchProducts({
    cacheStrategy,
  })

  useEffect(() => {
    return () => {
      const pendingPrefetchIds = Array.from(activePrefetchIdsRef.current)
      for (const prefetchId of pendingPrefetchIds) {
        cancelStorefrontPrefetch(prefetchId)
      }

      const cleanupTimers = Array.from(cleanupTimersRef.current.values())
      for (const timer of cleanupTimers) {
        clearTimeout(timer)
      }

      cleanupTimersRef.current.clear()
      activePrefetchIdsRef.current.clear()
    }
  }, [cancelStorefrontPrefetch])

  const clearCleanupTimer = useCallback((prefetchId: string) => {
    const timer = cleanupTimersRef.current.get(prefetchId)
    if (timer) {
      clearTimeout(timer)
      cleanupTimersRef.current.delete(prefetchId)
    }
  }, [])

  const scheduleIdCleanup = useCallback(
    (prefetchId: string, delay: number) => {
      clearCleanupTimer(prefetchId)
      const timer = setTimeout(() => {
        activePrefetchIdsRef.current.delete(prefetchId)
        cleanupTimersRef.current.delete(prefetchId)
      }, delay + 50)
      cleanupTimersRef.current.set(prefetchId, timer)
    },
    [clearCleanupTimer]
  )

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
    [prefetchProducts, selectedRegion?.id, enabled, cacheStrategy, prefetchLimit]
  )

  // Delayed prefetch with cancellation support
  const delayedPrefetch = useCallback(
    (categoryIds: string[], delay = 800, prefetchId?: string) => {
      const id = prefetchId || `prefetch_${Date.now()}_${Math.random()}`
      if (!(enabled && selectedRegion?.id) || categoryIds.length === 0) {
        return id
      }
      activePrefetchIdsRef.current.add(id)

      delayedStorefrontPrefetch(
        {
          page: 1,
          limit: prefetchLimit,
          filters: { categories: categoryIds, sizes: [] },
          region_id: selectedRegion?.id,
          sort: "newest",
        },
        delay,
        id
      )
      scheduleIdCleanup(id, delay)

      return id
    },
    [
      delayedStorefrontPrefetch,
      enabled,
      prefetchLimit,
      scheduleIdCleanup,
      selectedRegion?.id,
    ]
  )

  // Cancel specific prefetch by ID
  const cancelPrefetch = useCallback(
    (prefetchId: string) => {
      const exists = activePrefetchIdsRef.current.has(prefetchId)
      cancelStorefrontPrefetch(prefetchId)
      clearCleanupTimer(prefetchId)
      activePrefetchIdsRef.current.delete(prefetchId)
      return exists
    },
    [cancelStorefrontPrefetch, clearCleanupTimer]
  )

  // Cancel all pending prefetches
  const cancelAllPrefetches = useCallback(() => {
    const pendingPrefetchIds = Array.from(activePrefetchIdsRef.current)
    for (const prefetchId of pendingPrefetchIds) {
      cancelStorefrontPrefetch(prefetchId)
    }
    const cleanupTimers = Array.from(cleanupTimersRef.current.values())
    for (const timer of cleanupTimers) {
      clearTimeout(timer)
    }
    cleanupTimersRef.current.clear()
    activePrefetchIdsRef.current.clear()
  }, [cancelStorefrontPrefetch])

  return {
    prefetchCategoryProducts,
    delayedPrefetch,
    cancelPrefetch,
    cancelAllPrefetches,
  }
}
