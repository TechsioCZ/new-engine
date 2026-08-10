import { useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { cacheConfig } from "@/lib/cache-config"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { buildPrefetchParams } from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"
import { getProducts, getProductsGlobal } from "@/services/product-service"

import { useRegion } from "./use-region"

export const usePrefetchProducts = () => {
  const { regionId, countryCode } = useRegion()
  const queryClient = useQueryClient()
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchCategoryProducts = async (
    categoryId: string[],
    prefetchedBy?: string,
  ) => {
    if (regionId === undefined || regionId === "") {
      return
    }
    const [firstCategory] = categoryId
    if (firstCategory === undefined || firstCategory === "") {
      return
    }

    const queryParams = buildPrefetchParams({
      category_id: categoryId,
      country_code: countryCode,
      region_id: regionId,
    })

    const queryKey = queryKeys.products.list(queryParams)
    const cached =
      queryClient.getQueryData<Awaited<ReturnType<typeof getProducts>>>(
        queryKey,
      )

    if (cached === undefined) {
      const label =
        categoryId.length === 1
          ? firstCategory.slice(-6)
          : `${firstCategory.slice(-6)} +${categoryId.length - 1}`
      const start = performance.now()

      prefetchLogger.start("Categories", label)

      await queryClient.prefetchQuery({
        queryFn: async ({ signal }) => await getProducts(queryParams, signal),
        queryKey,
        ...cacheConfig.semiStatic,
        ...(prefetchedBy !== undefined && prefetchedBy !== ""
          ? { meta: { prefetchedBy } }
          : {}),
      })

      const duration = performance.now() - start
      prefetchLogger.complete("Categories", label, duration)
    } else {
      const label = firstCategory.slice(-6)
      prefetchLogger.cacheHit("Categories", label)
    }
  }

  const prefetchRootCategories = async (categoryId: string[]) => {
    if (regionId === undefined || regionId === "") {
      return
    }
    const [firstCategory] = categoryId
    if (firstCategory === undefined || firstCategory === "") {
      return
    }

    const queryParams = buildPrefetchParams({
      category_id: categoryId,
      country_code: countryCode,
      region_id: regionId,
    })

    const queryKey = queryKeys.products.list(queryParams)
    const cached =
      queryClient.getQueryData<Awaited<ReturnType<typeof getProductsGlobal>>>(
        queryKey,
      )

    if (cached === undefined) {
      const label =
        categoryId.length === 1
          ? firstCategory.slice(-6)
          : `${firstCategory.slice(-6)} +${categoryId.length - 1}`
      const start = performance.now()

      prefetchLogger.start("Root", label)

      await queryClient.prefetchQuery({
        queryFn: async () => await getProductsGlobal(queryParams),
        queryKey,
        ...cacheConfig.semiStatic,
      })

      const duration = performance.now() - start
      prefetchLogger.complete("Root", label, duration)
    } else {
      const label = firstCategory.slice(-6)
      prefetchLogger.cacheHit("Root", label)
    }
  }

  const delayedPrefetch = (categoryId: string[], delay = 800) => {
    const id = categoryId.join("-")
    const existing = timeoutsRef.current.get(id)
    if (existing) {
      clearTimeout(existing)
    }

    const timeoutId = setTimeout(() => {
      void prefetchCategoryProducts(categoryId)
      timeoutsRef.current.delete(id)
    }, delay)

    timeoutsRef.current.set(id, timeoutId)
    return id
  }

  const cancelPrefetch = (prefetchId: string) => {
    const timeout = timeoutsRef.current.get(prefetchId)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(prefetchId)
    }
  }

  return {
    cancelPrefetch,
    delayedPrefetch,
    prefetchCategoryProducts,
    prefetchRootCategories,
  }
}
