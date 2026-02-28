"use client"

import { useQueryClient } from "@tanstack/react-query"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { queryKeys } from "@/lib/query-keys"
import { runLoggedPrefetch } from "./prefetch-utils"
import { productHooks } from "./product-hooks-base"
import { useRegion } from "./use-region"

export function usePrefetchProduct() {
  const { regionId, countryCode } = useRegion()
  const queryClient = useQueryClient()
  const {
    prefetchProduct: prefetchProductBase,
    delayedPrefetch: delayedPrefetchBase,
    cancelPrefetch: cancelPrefetchBase,
  } = productHooks.usePrefetchProduct({
    cacheStrategy: "semiStatic",
    skipIfCached: true,
    skipMode: "any",
  })

  const prefetchProduct = async (handle: string, fields?: string) => {
    if (!(regionId && handle)) {
      return
    }

    const queryKey = queryKeys.products.detail(handle, regionId, countryCode)

    await runLoggedPrefetch({
      queryClient,
      queryKey,
      type: "Product",
      label: handle,
      prefetch: () =>
        prefetchProductBase(
          {
            handle,
            fields,
            region_id: regionId,
            country_code: countryCode,
          },
          {
            skipIfCached: true,
            skipMode: "any",
          }
        ),
    })
  }

  const delayedPrefetch = (
    handle: string,
    delay: number = PREFETCH_DELAYS.PRODUCT_DETAIL,
    fields?: string
  ) => {
    if (!(regionId && handle)) {
      return handle
    }
    return delayedPrefetchBase(
      {
        handle,
        fields,
        region_id: regionId,
        country_code: countryCode,
      },
      delay,
      handle
    )
  }

  const cancelPrefetch = (handle: string) => {
    cancelPrefetchBase(handle)
  }

  return {
    prefetchProduct,
    delayedPrefetch,
    cancelPrefetch,
  }
}
