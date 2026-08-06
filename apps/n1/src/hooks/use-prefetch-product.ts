"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRef } from "react"

import { cacheConfig } from "@/lib/cache-config"
import { prefetchLogger } from "@/lib/loggers/prefetch"
import { queryKeys } from "@/lib/query-keys"
import { getProductByHandle } from "@/services/product-service"

import { useRegion } from "./use-region"

const PREFETCH_DELAY = 400
export const usePrefetchProduct = () => {
  const { regionId, countryCode } = useRegion()
  const queryClient = useQueryClient()
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const prefetchProduct = async (handle: string, fields?: string) => {
    if (regionId === undefined || regionId === "" || handle === "") {
      return
    }

    const queryKey = queryKeys.products.detail(handle, regionId, countryCode)
    const cached =
      queryClient.getQueryData<Awaited<ReturnType<typeof getProductByHandle>>>(
        queryKey,
      )

    if (cached === undefined) {
      prefetchLogger.start("Product", handle)
      await queryClient.prefetchQuery({
        queryFn: async () =>
          await getProductByHandle({
            country_code: countryCode,
            handle,
            region_id: regionId,
            ...(fields !== undefined && fields !== "" ? { fields } : {}),
          }),
        queryKey,
        ...cacheConfig.semiStatic,
      })
    } else {
      prefetchLogger.cacheHit("Product", handle)
    }
  }

  const delayedPrefetch = (
    handle: string,
    delay = PREFETCH_DELAY,
    fields?: string,
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
    cancelPrefetch,
    delayedPrefetch,
    prefetchProduct,
  }
}
