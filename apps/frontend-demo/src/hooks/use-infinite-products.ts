"use client"

import { useRef } from "react"
import type { Product } from "@/types/product"
import type { ProductListParams } from "@/types/product-query"
import type { PageRange } from "./use-url-filters"
import { useRegions } from "./use-region"
import { useStorefrontInfiniteProducts } from "./storefront-products"

const MAX_BOOTSTRAP_PAGES = 8

interface UseInfiniteProductsParams extends Omit<ProductListParams, "offset"> {
  pageRange: PageRange
  enabled?: boolean
}

interface UseInfiniteProductsReturn {
  products: Product[]
  isLoading: boolean
  isFetching: boolean
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
    end: number
    limit: number
    initialLimit: number
  } | null>(null)

  if (
    !rangeBootstrapRef.current ||
    rangeBootstrapRef.current.start !== pageRange.start ||
    rangeBootstrapRef.current.end !== pageRange.end ||
    rangeBootstrapRef.current.limit !== limit
  ) {
    const totalPagesNeeded = Math.max(1, pageRange.end - pageRange.start + 1)
    const clampedPagesNeeded = Math.min(totalPagesNeeded, MAX_BOOTSTRAP_PAGES)
    rangeBootstrapRef.current = {
      start: pageRange.start,
      end: pageRange.end,
      limit,
      initialLimit: clampedPagesNeeded * limit,
    }
  }

  const initialLimit = rangeBootstrapRef.current.initialLimit
  const optimizedInitialLimit = initialLimit > limit ? initialLimit : undefined

  const {
    products,
    isLoading,
    isFetching,
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
    isFetching,
    error,
    totalCount,
    currentPageRange: pageRange,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: () => fetchNextPage(),
    refetch: () => refetch(),
  }
}
