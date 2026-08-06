import { useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { useRegions } from "@/hooks/use-region"
import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"

interface UseCategoryPrefetchOptions {
  enabled?: boolean
  cacheStrategy?: keyof typeof cacheConfig
  // Use a custom limit for prefetches without changing normal queries.
  prefetchLimit?: number
}

export const useCategoryPrefetch = (options?: UseCategoryPrefetchOptions) => {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
  const prefetchLimit = options?.prefetchLimit ?? 12
  // Track active timeouts for cancellation
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchCategoryProducts = async (categoryIds: string[]) => {
    const regionId = selectedRegion?.id
    if (
      !enabled ||
      regionId === undefined ||
      regionId.length === 0 ||
      categoryIds.length === 0
    ) {
      return
    }

    // Check if data is already in cache
    const queryKey = queryKeys.products.list({
      filters: { categories: categoryIds, sizes: [] },
      limit: prefetchLimit,
      page: 1,
      region_id: regionId,
      sort: "newest",
    })

    const cachedData = queryClient.getQueryData(queryKey)
    const queryState = queryClient.getQueryState(queryKey)

    // Only prefetch if data is not in cache or is stale
    if (cachedData === undefined || queryState?.isInvalidated === true) {
      await queryClient.prefetchQuery({
        queryFn: async () =>
          await getProducts({
            filters: { categories: categoryIds, sizes: [] },
            limit: prefetchLimit,
            offset: 0,
            region_id: regionId,
            sort: "newest",
          }),
        queryKey,
        ...cacheConfig[cacheStrategy],
      })
    }
  }

  // Delayed prefetch with cancellation support
  const delayedPrefetch = (
    categoryIds: string[],
    delay = 800,
    prefetchId?: string,
  ) => {
    const id = prefetchId ?? `prefetch_${Date.now()}_${crypto.randomUUID()}`

    // Cancel any existing timeout for this ID
    const existingTimeout = timeoutsRef.current.get(id)
    if (existingTimeout !== undefined) {
      clearTimeout(existingTimeout)
    }

    const runPrefetch = async () => {
      try {
        await prefetchCategoryProducts(categoryIds)
      } catch (error) {
        console.error("Category prefetch failed:", error)
      } finally {
        timeoutsRef.current.delete(id)
      }
    }

    // Create new timeout
    const timeoutId = setTimeout(() => {
      void runPrefetch()
    }, delay)

    // Store timeout for potential cancellation
    timeoutsRef.current.set(id, timeoutId)

    // Return the ID so the caller can cancel this prefetch.
    return id
  }

  // Cancel specific prefetch by ID
  const cancelPrefetch = (prefetchId: string) => {
    const timeout = timeoutsRef.current.get(prefetchId)
    if (timeout !== undefined) {
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
