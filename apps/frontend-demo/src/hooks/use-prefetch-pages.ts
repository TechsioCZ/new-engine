"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"
import type { ProductFilters } from "@/services/product-service"

interface UsePrefetchPagesParams {
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  productsLength: number
  pageSize: number
  sortBy: string | undefined
  totalPages: number
  regionId: string | undefined
  searchQuery: string | undefined
  filters: ProductFilters
}

/**
 * Hook for prefetching product pages to improve perceived performance
 * This is a simple extraction of the existing prefetch logic
 */
export const usePrefetchPages = ({
  currentPage,
  hasNextPage,
  hasPrevPage,
  productsLength,
  pageSize,
  sortBy,
  totalPages,
  regionId,
  searchQuery,
  filters,
}: UsePrefetchPagesParams) => {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (productsLength === 0) {
      return
    }

    const pagesToPrefetch: number[] = []
    const query =
      searchQuery === undefined || searchQuery.length === 0
        ? undefined
        : searchQuery

    // Always prefetch first page (if not current)
    if (currentPage !== 1) {
      pagesToPrefetch.push(1)
    }

    // Prefetch previous pages
    if (hasPrevPage) {
      pagesToPrefetch.push(currentPage - 1)
      // Also prefetch page -2 if it exists
      if (currentPage - 2 >= 1) {
        pagesToPrefetch.push(currentPage - 2)
      }
    }

    // Prefetch next pages
    if (hasNextPage) {
      pagesToPrefetch.push(currentPage + 1)
      // Also prefetch page +2 if it exists
      if (currentPage + 2 <= totalPages) {
        pagesToPrefetch.push(currentPage + 2)
      }
    }

    // Prefetch last page (if known and not current)
    if (totalPages > 1 && currentPage !== totalPages) {
      pagesToPrefetch.push(totalPages)
    }

    // Execute all prefetches
    for (const page of pagesToPrefetch) {
      const offset = (page - 1) * pageSize
      void queryClient.prefetchQuery({
        queryFn: async () =>
          await getProducts({
            filters,
            limit: pageSize,
            offset,
            q: query,
            region_id: regionId,
            sort: sortBy === "relevance" ? undefined : sortBy,
          }),
        queryKey: queryKeys.products.list({
          filters,
          limit: pageSize,
          page,
          q: query,
          region_id: regionId,
          sort: sortBy === "relevance" ? undefined : sortBy,
        }),
      })
    }
  }, [
    currentPage,
    hasNextPage,
    hasPrevPage,
    productsLength,
    queryClient,
    pageSize,
    sortBy,
    totalPages,
    regionId,
    searchQuery,
    filters,
  ])
}
