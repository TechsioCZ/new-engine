"use client"

import { keepPreviousData } from "@tanstack/react-query"
import { appendQueryKey } from "@techsio/storefront-data/shared/query-keys"
import { buildStorefrontProductListParams, storefront } from "@/lib/storefront"
import {
  buildProductListQuery,
  type ProductListParams,
} from "@/services/product-service"
import type { Product } from "@/types/product"
import type { PageRange } from "./use-url-filters"

interface UseInfiniteProductsParams extends Omit<ProductListParams, "offset"> {
  pageRange: PageRange
  enabled?: boolean
}

type UseInfiniteProductsReturn = {
  products: Product[]
  isLoading: boolean
  error: string | null
  totalCount: number
  queryKey: readonly unknown[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => Promise<unknown>
}

type StorefrontInfiniteProductsInput = Parameters<
  typeof storefront.hooks.products.useInfiniteProducts
>[0]

const toStorefrontInfiniteProductsInput = (
  params: UseInfiniteProductsParams
): StorefrontInfiniteProductsInput => {
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

  const totalPagesNeeded = pageRange.end - pageRange.start + 1
  const initialLimit =
    pageRange.isRange && totalPagesNeeded > 1
      ? totalPagesNeeded * limit
      : undefined

  const { offset: _offset, ...query } = buildProductListQuery({
    limit,
    filters,
    sort,
    fields,
    q,
    category,
    region_id,
  })

  return {
    ...query,
    page: pageRange.start,
    limit,
    ...(typeof initialLimit === "number" ? { initialLimit } : {}),
    enabled: enabled !== undefined ? enabled : !!region_id,
  } as StorefrontInfiniteProductsInput
}

export const buildInfiniteProductsQueryKey = (
  params: UseInfiniteProductsParams
): readonly unknown[] => {
  const {
    enabled: _enabled,
    initialLimit,
    ...input
  } = toStorefrontInfiniteProductsInput(
    params
  ) as StorefrontInfiniteProductsInput & {
    initialLimit?: number
  }
  const baseListParams = buildStorefrontProductListParams(input)
  const baseQueryKey = storefront.queryKeys.products.infinite(baseListParams)

  return typeof initialLimit === "number"
    ? appendQueryKey(baseQueryKey, { initialLimit })
    : baseQueryKey
}

/**
 * Hook for fetching infinite product lists with "load more" functionality
 */
export function useInfiniteProducts(
  params: UseInfiniteProductsParams
): UseInfiniteProductsReturn {
  const queryKey = buildInfiniteProductsQueryKey(params)
  const {
    products,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    totalCount,
  } = storefront.hooks.products.useInfiniteProducts(
    toStorefrontInfiniteProductsInput(params),
    {
      queryOptions: {
        placeholderData: keepPreviousData,
      },
    }
  )

  return {
    products,
    isLoading,
    error,
    totalCount,
    queryKey,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  }
}
