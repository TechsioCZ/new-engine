"use client"

import { useRef } from "react"
import type { Product } from "@/types/product"
import type { ProductListParams } from "@/types/product-query"
import type { PageRange } from "./use-url-filters"
import { useRegions } from "./use-region"
import { useStorefrontInfiniteProducts } from "./storefront-products"

interface UseInfiniteProductsParams extends Omit<ProductListParams, "offset"> {
  pageRange: PageRange
  enabled?: boolean
}

interface UseInfiniteProductsReturn {
  products: Product[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPageRange: PageRange
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => Promise<unknown>
  refetch: () => Promise<unknown>
}

/**
 * Hook for fetching infinite product lists with "load more" functionality
 */
export function useInfiniteProducts(
  params: UseInfiniteProductsParams
): UseInfiniteProductsReturn {
  const { selectedRegion } = useRegions()
  const {
    pageRange,
    limit = 12,
    filters,
    sort,
    fields,
    q,
    category,
    region_id,
    enabled,
  } = params
  const resolvedRegionId = region_id ?? selectedRegion?.id
  const isQueryEnabled =
    enabled !== undefined ? enabled : Boolean(resolvedRegionId)
  const hasSizeFilters = Boolean(filters?.sizes?.length)

  const rangeBootstrapRef = useRef<{
    start: number
    limit: number
    initialLimit: number
  } | null>(null)

  if (
    !rangeBootstrapRef.current ||
    rangeBootstrapRef.current.start !== pageRange.start ||
    rangeBootstrapRef.current.limit !== limit
  ) {
    const totalPagesNeeded = pageRange.end - pageRange.start + 1
    rangeBootstrapRef.current = {
      start: pageRange.start,
      limit,
      initialLimit: totalPagesNeeded * limit,
    }
  }

  const initialLimit = rangeBootstrapRef.current.initialLimit
  const optimizedInitialLimit = initialLimit > limit ? initialLimit : undefined

  const {
    products,
    isLoading,
    error,
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useStorefrontInfiniteProducts(
    {
      page: pageRange.start,
      limit,
      initialLimit: optimizedInitialLimit,
      filters,
      sort,
      fields,
      q,
      category,
      region_id: resolvedRegionId,
      enabled: isQueryEnabled,
    },
    hasSizeFilters
      ? {
          queryOptions: {
            retry: false,
          },
        }
      : undefined
  )

  return {
    products,
    isLoading,
    error,
    totalCount,
    currentPageRange: pageRange,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: () => fetchNextPage(),
    refetch: () => refetch(),
  }
}
