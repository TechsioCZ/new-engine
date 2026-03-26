"use client"

import { useEffect } from "react"
import { buildProductsPageFragmentInput } from "@/hooks/use-infinite-products"
import type { ProductFilters } from "@/lib/product-query-params"
import { usePrefetchProducts } from "./use-prefetch-products"

type UsePrefetchPagesParams = {
  enabled?: boolean
  currentPage: number
  totalPages: number
  limit: number
  filters?: ProductFilters
  sort?: string
  q?: string
  category?: string | string[]
  region_id?: string
  country_code?: string
}

export function usePrefetchPages({
  enabled = true,
  currentPage,
  totalPages,
  limit,
  filters,
  sort,
  q,
  category,
  region_id,
  country_code,
}: UsePrefetchPagesParams) {
  const { prefetchProducts } = usePrefetchProducts({
    enabled,
    cacheStrategy: "semiStatic",
  })

  useEffect(() => {
    if (!(enabled && totalPages > 0)) {
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []
    const baseParams = {
      limit,
      filters,
      sort,
      q,
      category,
      region_id,
      country_code,
    }

    const schedulePrefetch = (page: number, delay = 0) => {
      if (page < 1 || page > totalPages || page === currentPage) {
        return
      }

      const run = () =>
        prefetchProducts(buildProductsPageFragmentInput(baseParams, page))

      if (delay <= 0) {
        run().catch(() => {
          // Ignore prefetch errors; the interactive fetch remains authoritative.
        })
        return
      }

      timers.push(setTimeout(run, delay))
    }

    schedulePrefetch(currentPage + 1)

    return () => {
      for (const timer of timers) {
        clearTimeout(timer)
      }
    }
  }, [
    enabled,
    currentPage,
    totalPages,
    limit,
    filters,
    sort,
    q,
    category,
    region_id,
    country_code,
    prefetchProducts,
  ])
}
