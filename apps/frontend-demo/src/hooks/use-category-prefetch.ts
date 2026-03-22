import { useCallback, useRef } from "react"
import type { cacheConfig } from "@/lib/cache-config"
import { usePrefetchProducts } from "./use-prefetch-products"

type UseCategoryPrefetchOptions = {
  enabled?: boolean
  cacheStrategy?: keyof typeof cacheConfig
}

export function useCategoryPrefetch(options?: UseCategoryPrefetchOptions) {
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
  const { prefetchCategoryProducts: runPrefetchCategoryProducts } =
    usePrefetchProducts({
      enabled,
      cacheStrategy,
    })
  // Track active timeouts for cancellation
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchCategoryProducts = useCallback(
    async (categoryIds: string[]) => {
      if (!(enabled && categoryIds.length > 0)) {
        return
      }

      await runPrefetchCategoryProducts(categoryIds)
    },
    [enabled, runPrefetchCategoryProducts]
  )

  // Delayed prefetch with cancellation support
  const delayedPrefetch = useCallback(
    (categoryIds: string[], delay = 800, prefetchId?: string) => {
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
    },
    [prefetchCategoryProducts]
  )

  // Cancel specific prefetch by ID
  const cancelPrefetch = useCallback((prefetchId: string) => {
    const timeout = timeoutsRef.current.get(prefetchId)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(prefetchId)
      return true
    }
    return false
  }, [])

  // Cancel all pending prefetches
  const cancelAllPrefetches = useCallback(() => {
    const timeouts = Array.from(timeoutsRef.current.values())
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    timeoutsRef.current.clear()
  }, [])

  return {
    prefetchCategoryProducts,
    delayedPrefetch,
    cancelPrefetch,
    cancelAllPrefetches,
  }
}
