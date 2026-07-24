"use client"

import { useSuspenseQuery } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { fetchLogger } from "@/lib/loggers/fetch"
import { queryKeys } from "@/lib/query-keys"
import { getProductByHandle } from "@/services/product-service"

import { useSuspenseRegion } from "./use-region"

type UseProductParams = {
  handle: string
  fields?: string
}

export function useSuspenseProduct({ handle, fields }: UseProductParams) {
  const { regionId, countryCode } = useSuspenseRegion()

  if (!(handle && regionId && countryCode)) {
    throw new Error("Missing required product query parameters")
  }

  const queryKey = queryKeys.products.detail(handle, regionId, countryCode)

  return useSuspenseQuery({
    queryKey,
    queryFn: async () => {
      const start = performance.now()
      const data = await getProductByHandle({
        handle,
        region_id: regionId,
        country_code: countryCode,
        ...(fields ? { fields } : {}),
      })
      const duration = performance.now() - start

      if (process.env["NODE_ENV"] === "development") {
        fetchLogger.current(handle, duration)
      }

      return data
    },
    ...cacheConfig.semiStatic,
  })
}
