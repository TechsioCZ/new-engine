import { useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { useRegions } from "@/hooks/use-region"
import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"

interface UseCategoryPrefetchOptions {
  enabled?: boolean
  cacheStrategy?: keyof typeof cacheConfig
  prefetchLimit?: number // Custom limit for prefetch vs normal queries
}

export function useCategoryPrefetch(options?: UseCategoryPrefetchOptions) {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
  const prefetchLimit = options?.prefetchLimit ?? 12
  // Track active timeouts for cancellation
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchCategoryProducts = async (categoryIds: string[]) => {
    if (!(enabled && selectedRegion?.id) || categoryIds.length === 0) {
      return
    }

    // Check if data is already in cache
    const queryKey = queryKeys.products.list({
      filters: { categories: categoryIds, sizes: [] },
      limit: prefetchLimit,
      page: 1,
      region_id: selectedRegion.id,
      sort: "newest",
    })

    const cachedData = queryClient.getQueryData(queryKey)
    const queryState = queryClient.getQueryState(queryKey)

    // Only prefetch if data is not in cache or is stale
    if (!cachedData || queryState?.isInvalidated) {
      //  console.log(`[Prefetch] Executing prefetch for ${categoryIds.length} categories`)

      await queryClient.prefetchQuery({
        queryFn: async () =>
          getProducts({
            filters: { categories: categoryIds, sizes: [] },
            limit: prefetchLimit,
            offset: 0,
            region_id: selectedRegion.id,
            sort: "newest",
          }),
        queryKey,
        ...cacheConfig[cacheStrategy],
      })
    } /* else {
        console.log(`[Prefetch] Skipping - already in cache for ${categoryIds.length} categories`)
      }*/
  }

  // Delayed prefetch with cancellation support
  const delayedPrefetch = (
    categoryIds: string[],
    delay = 800,
    prefetchId?: string
  ) => {
    const id = prefetchId || `prefetch_${Date.now()}_${Math.random()}`

    // Cancel any existing timeout for this ID
    const existingTimeout = timeoutsRef.current.get(id)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Create new timeout
    const timeoutId = setTimeout(() => {
      prefetchCategoryProducts(categoryIds).catch(console.error)
      timeoutsRef.current.delete(id)
    }, delay)

    // Store timeout for potential cancellation
    timeoutsRef.current.set(id, timeoutId)

    return id // Return ID for potential cancellation
  }

  // Cancel specific prefetch by ID
  const cancelPrefetch = (prefetchId: string) => {
    const timeout = timeoutsRef.current.get(prefetchId)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(prefetchId)
      return true
    }
    return false
  }

  // Cancel all pending prefetches
  const cancelAllPrefetches = () => {
    const timeouts = [...timeoutsRef.current.values()]
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    timeoutsRef.current.clear()
  }

  return {
    cancelAllPrefetches,
    cancelPrefetch,
    delayedPrefetch,
    prefetchCategoryProducts,
  }
}
