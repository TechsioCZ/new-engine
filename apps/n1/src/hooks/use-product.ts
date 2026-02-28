"use client"

import { productHooks } from "./product-hooks-base"

type UseProductParams = {
  handle: string
  fields?: string
}

export function useSuspenseProduct({ handle, fields }: UseProductParams) {
  const { query } = productHooks.useSuspenseProduct({
    handle,
    fields,
  })

  return query
}
