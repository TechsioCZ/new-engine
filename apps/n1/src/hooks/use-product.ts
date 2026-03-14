"use client"

import { storefront } from "./storefront-preset"

type UseProductParams = {
  handle: string
  fields?: string
}

const productHooks = storefront.hooks.products

export function useSuspenseProduct({ handle, fields }: UseProductParams) {
  const result = productHooks.useSuspenseProduct({
    handle,
    fields,
  })

  return {
    product: result.product,
  }
}
