"use client"

import { storefront } from "./storefront-preset"

type UseProductParams = {
  handle: string
  fields?: string
}

type ProductHooks = typeof storefront.hooks.products
type ProductResult = ReturnType<ProductHooks["useSuspenseProduct"]>["product"]

type UseSuspenseProductReturn = {
  product: ProductResult
}

const productHooks = storefront.hooks.products

export function useSuspenseProduct({
  handle,
  fields,
}: UseProductParams): UseSuspenseProductReturn {
  const result = productHooks.useSuspenseProduct({
    handle,
    fields,
  })

  return {
    product: result.product,
  }
}
