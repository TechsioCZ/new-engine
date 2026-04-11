"use client"

import { useMemo } from "react"
import { PREFETCH_DELAYS } from "@/lib/prefetch-config"
import { storefront } from "./storefront-preset"

type UsePrefetchPagesParams = {
  enabled?: boolean
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalPages: number
  pageSize: number
  category_id: string[]
}

export function usePrefetchPages({
  enabled = true,
  currentPage,
  hasNextPage,
  hasPrevPage,
  totalPages,
  pageSize,
  category_id,
}: UsePrefetchPagesParams) {
  const productHooks = storefront.hooks.products
  const baseInput = useMemo(
    () => ({
      category_id,
      limit: pageSize,
    }),
    [category_id, pageSize]
  )

  productHooks.usePrefetchPages({
    enabled,
    shouldPrefetch: category_id.length > 0,
    baseInput,
    currentPage,
    hasNextPage,
    hasPrevPage,
    totalPages,
    pageSize,
    mode: "priority",
    cacheStrategy: "semiStatic",
    delays: {
      medium: PREFETCH_DELAYS.PAGES.MEDIUM,
      low: PREFETCH_DELAYS.PAGES.LOW,
    },
  })
}
