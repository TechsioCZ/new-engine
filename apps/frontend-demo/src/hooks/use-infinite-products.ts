"use client"

import { useInfiniteQuery } from "@tanstack/react-query"
import type { InfiniteData } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"
import type {
  ProductListParams,
  ProductListResponse,
} from "@/services/product-service"
import type { Product } from "@/types/product"

import type { PageRange } from "./use-url-filters"

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
  fetchNextPage: () => Promise<void>
  refetch: () => void
}

/**
 * Hook for fetching infinite product lists with "load more" functionality
 */
export const useInfiniteProducts = (
  params: UseInfiniteProductsParams,
): UseInfiniteProductsReturn => {
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

  const baseOffset = (pageRange.start - 1) * limit
  const totalPagesNeeded = pageRange.end - pageRange.start + 1

  // For range queries, we need to load all pages in the range at once
  const rangeLimit = totalPagesNeeded * limit

  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<
    ProductListResponse,
    Error,
    InfiniteData<ProductListResponse, number>,
    ReturnType<typeof queryKeys.products.infinite>,
    number
  >({
    enabled: enabled ?? Boolean(region_id),
    getNextPageParam: (lastPage, allPages) => {
      // Since we load the full range in the first request,
      // subsequent calls are just "load more" beyond the range
      const totalFetched = allPages.reduce(
        (sum, page) => sum + page.products.length,
        0,
      )

      // Check if there are more products to load
      const hasMore = totalFetched < lastPage.count
      if (!hasMore) {
        return null
      }

      // Calculate offset for the next batch (beyond current range)
      return baseOffset + totalFetched
    },
    initialPageParam: baseOffset,
    queryFn: async ({ pageParam }) => {
      // For the initial load, use rangeLimit to load all pages in range at once
      // For subsequent "load more" calls, use normal limit
      const isInitialLoad = pageParam === baseOffset
      const requestLimit = isInitialLoad ? rangeLimit : limit

      return await getProducts({
        category,
        fields,
        filters,
        limit: requestLimit,
        offset: pageParam,
        q,
        region_id,
        sort,
      })
    },
    queryKey: queryKeys.products.infinite({
      // Use only start to keep key stable when extending
      category,
      filters,
      limit,
      pageRangeStart: pageRange.start,
      q,
      region_id,
      sort,
    }),
    ...cacheConfig.semiStatic,
  })

  // Flatten all pages into a single array
  const products = data?.pages.flatMap((page) => page.products) ?? []
  const totalCount = data?.pages[0]?.count ?? 0

  return {
    currentPageRange: pageRange,
    error: error instanceof Error ? error.message : null,
    fetchNextPage: async () => {
      await fetchNextPage()
    },
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    products,
    refetch: () => {
      void refetch()
    },
    totalCount,
  }
}
