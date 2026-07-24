"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { cacheConfig } from "@/lib/cache-config"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { queryKeys } from "@/lib/query-keys"
import { getProductByHandle } from "@/services/product-service"

import { useRegion } from "./use-region"

const PREFETCH_DELAY = 400
export function usePrefetchProduct() {
  const { regionId, countryCode } = useRegion()
  const queryClient = useQueryClient()
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchProduct = async (handle: string, fields?: string) => {
    if (!(regionId && handle)) {
      return
    }

    const queryKey = queryKeys.products.detail(handle, regionId, countryCode)
    const cached = queryClient.getQueryData(queryKey)

    if (cached) {
      prefetchLogger.cacheHit("Product", handle)
    } else {
      prefetchLogger.start("Product", handle)
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () =>
          getProductByHandle({
            handle,
            region_id: regionId,
            country_code: countryCode,
            ...(fields ? { fields } : {}),
          }),
        ...cacheConfig.semiStatic,
      })
    }
  }

  const delayedPrefetch = (
    handle: string,
    delay = PREFETCH_DELAY,
    fields?: string
  ) => {
    const existing = timeoutsRef.current.get(handle)
    if (existing) {
      clearTimeout(existing)
    }

    const timeoutId = setTimeout(() => {
      void prefetchProduct(handle, fields)
      timeoutsRef.current.delete(handle)
    }, delay)

    timeoutsRef.current.set(handle, timeoutId)
    return handle
  }

  const cancelPrefetch = (handle: string) => {
    const timeout = timeoutsRef.current.get(handle)
    if (timeout) {
      clearTimeout(timeout)
      timeoutsRef.current.delete(handle)
    }
  }

  return {
    prefetchProduct,
    delayedPrefetch,
    cancelPrefetch,
  }
}
