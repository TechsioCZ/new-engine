"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { runLoggedPrefetch } from "./prefetch-utils"
import { storefront } from "./storefront-preset"

export function usePrefetchProduct() {
  const region = useRegionContext()
  const regionId = region?.region_id
  const countryCode = region?.country_code
  const productHooks = storefront.hooks.products
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

    const queryInput = {
      handle,
      fields,
      region_id: regionId,
      country_code: countryCode,
    }

    await runLoggedPrefetch({
      type: "Product",
      label: handle,
      prefetch: () => prefetchProductBase(queryInput),
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
    const queryInput = {
      handle,
      fields,
      region_id: regionId,
      country_code: countryCode,
    }
    return delayedPrefetchBase(
      queryInput,
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
