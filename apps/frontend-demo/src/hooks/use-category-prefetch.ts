import { useQueryClient, type QueryKey } from "@tanstack/react-query"
import { useCallback, useEffect, useRef } from "react"
import type { CacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { useRegions } from "@/hooks/use-region"
import {
  buildStorefrontProductListParams,
  storefrontProductQueryKeys,
  type StorefrontProductListInput,
  useStorefrontPrefetchProducts,
} from "./storefront-products"

interface UseCategoryPrefetchOptions {
  enabled?: boolean
  cacheStrategy?: keyof CacheConfig
  prefetchLimit?: number // Custom limit for prefetch vs normal queries
}

const CATEGORY_PREFETCH_SOURCE = "category-tree"
const DEFAULT_PREFETCH_DELAY = 800

type CategoryPrefetchRequest = {
  input: StorefrontProductListInput
  options: {
    cacheStrategy: keyof CacheConfig
    skipIfCached: true
    skipMode: "fresh"
    prefetchedBy: typeof CATEGORY_PREFETCH_SOURCE
  }
}

type InFlightPrefetchEntry = {
  queryKey: QueryKey
  runToken: symbol
}

export function useCategoryPrefetch(options?: UseCategoryPrefetchOptions) {
  const queryClient = useQueryClient()
  const { selectedRegion } = useRegions()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
  const prefetchLimit = options?.prefetchLimit ?? 12
  const activePrefetchIdsRef = useRef<Set<string>>(new Set())
  const inFlightPrefetchQueriesRef = useRef<Map<string, InFlightPrefetchEntry>>(
    new Map()
  )
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

      const inFlightEntries = Array.from(inFlightPrefetchQueriesRef.current.values())
      for (const entry of inFlightEntries) {
        void queryClient.cancelQueries({
          queryKey: entry.queryKey,
          exact: true,
          predicate: (query) =>
            query.meta?.prefetchedBy === CATEGORY_PREFETCH_SOURCE,
        })
      }

      delayedPrefetchTimersRef.current.clear()
      inFlightPrefetchQueriesRef.current.clear()
      activePrefetchIdsRef.current.clear()
    }
  }, [queryClient])

  const clearPrefetchTimer = useCallback((prefetchId: string) => {
    const timer = delayedPrefetchTimersRef.current.get(prefetchId)
    if (!timer) {
      return false
    }

    clearTimeout(timer)
    delayedPrefetchTimersRef.current.delete(prefetchId)
    return true
  }, [])

  const buildCategoryPrefetchRequest = useCallback(
    (categoryIds: string[]): CategoryPrefetchRequest | null => {
      if (!(enabled && selectedRegion?.id) || categoryIds.length === 0) {
        return null
      }

      return {
        input: {
          page: 1,
          limit: prefetchLimit,
          filters: { categories: categoryIds, sizes: [] },
          region_id: selectedRegion.id,
          sort: "newest",
        },
        options: {
          cacheStrategy,
          skipIfCached: true,
          skipMode: "fresh",
          prefetchedBy: CATEGORY_PREFETCH_SOURCE,
        },
      }
    },
    [cacheStrategy, enabled, prefetchLimit, selectedRegion?.id]
  )

  const cancelInFlightPrefetch = useCallback(
    (prefetchId: string) => {
      const entry = inFlightPrefetchQueriesRef.current.get(prefetchId)
      if (!entry) {
        return false
      }

      inFlightPrefetchQueriesRef.current.delete(prefetchId)
      void queryClient.cancelQueries({
        queryKey: entry.queryKey,
        exact: true,
        predicate: (query) =>
          query.meta?.prefetchedBy === CATEGORY_PREFETCH_SOURCE,
      })
      return true
    },
    [queryClient]
  )

  const executeCategoryPrefetch = useCallback(
    async (prefetchId: string, request: CategoryPrefetchRequest) => {
      activePrefetchIdsRef.current.add(prefetchId)
      const runToken = Symbol(prefetchId)

      const listParams = buildStorefrontProductListParams(request.input)
      const queryKey = storefrontProductQueryKeys.list(listParams)
      inFlightPrefetchQueriesRef.current.set(prefetchId, {
        queryKey,
        runToken,
      })

      try {
        await prefetchProducts(request.input, request.options)
      } finally {
        const currentEntry = inFlightPrefetchQueriesRef.current.get(prefetchId)
        if (currentEntry?.runToken === runToken) {
          inFlightPrefetchQueriesRef.current.delete(prefetchId)
          activePrefetchIdsRef.current.delete(prefetchId)
        }
      }
    },
    [prefetchProducts]
  )

  const prefetchCategoryProducts = useCallback(
    async (categoryIds: string[]) => {
      const request = buildCategoryPrefetchRequest(categoryIds)
      if (!request) {
        return
      }

      const prefetchId = `prefetch_${Date.now()}_${Math.random()}`
      await executeCategoryPrefetch(prefetchId, request)
    },
    [buildCategoryPrefetchRequest, executeCategoryPrefetch]
  )

  const delayedPrefetch = useCallback(
    (
      categoryIds: string[],
      delay = DEFAULT_PREFETCH_DELAY,
      prefetchId?: string
    ) => {
      const id = prefetchId || `prefetch_${Date.now()}_${Math.random()}`
      const request = buildCategoryPrefetchRequest(categoryIds)
      if (!request) {
        return id
      }

      activePrefetchIdsRef.current.add(id)
      clearPrefetchTimer(id)

      const timer = setTimeout(() => {
        delayedPrefetchTimersRef.current.delete(id)
        void executeCategoryPrefetch(id, request)
          .catch((error) => {
            console.warn("Category delayed prefetch failed", {
              error,
              prefetchId: id,
              categoryIds,
            })
          })
      }, delay)

      delayedPrefetchTimersRef.current.set(id, timer)
      return id
    },
    [
      buildCategoryPrefetchRequest,
      clearPrefetchTimer,
      executeCategoryPrefetch,
    ]
  )

  const cancelPrefetch = useCallback(
    (prefetchId: string) => {
      const wasActive = activePrefetchIdsRef.current.has(prefetchId)
      const hadPendingTimer = clearPrefetchTimer(prefetchId)
      const hadInFlightRequest = cancelInFlightPrefetch(prefetchId)
      activePrefetchIdsRef.current.delete(prefetchId)
      return wasActive || hadPendingTimer || hadInFlightRequest
    },
    [cancelInFlightPrefetch, clearPrefetchTimer]
  )

  const cancelAllPrefetches = useCallback(async () => {
    const pendingTimers = Array.from(delayedPrefetchTimersRef.current.values())
    for (const timer of pendingTimers) {
      clearTimeout(timer)
    }
    delayedPrefetchTimersRef.current.clear()

    const inFlightEntries = Array.from(inFlightPrefetchQueriesRef.current.values())
    await Promise.all(
      inFlightEntries.map((entry) =>
        queryClient.cancelQueries({
          queryKey: entry.queryKey,
          exact: true,
          predicate: (query) =>
            query.meta?.prefetchedBy === CATEGORY_PREFETCH_SOURCE,
        })
      )
    )
    inFlightPrefetchQueriesRef.current.clear()
    activePrefetchIdsRef.current.clear()
  }, [queryClient])

  return {
    prefetchCategoryProducts,
    delayedPrefetch,
    cancelPrefetch,
    cancelAllPrefetches,
  }
}
