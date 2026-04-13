"use client"

import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { runLoggedPrefetch } from "./prefetch-utils"
import { storefront } from "./storefront-preset"

export function usePrefetchProduct() {
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
    if (!handle) {
      return
    }

    const queryInput = {
      handle,
      fields,
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
    if (!handle) {
      return
    }
    const queryInput = {
      handle,
      fields,
    }
    return delayedPrefetchBase(queryInput, delay, handle)
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
