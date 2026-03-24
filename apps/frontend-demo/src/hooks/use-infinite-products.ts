"use client"

import {
  useIsFetching,
  useQueries,
  useQueryClient,
} from "@tanstack/react-query"
import {
  buildProductListQuery,
  type ProductListParams,
} from "@/lib/product-query-params"
import { buildStorefrontProductListParams, storefront } from "@/lib/storefront"
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
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => Promise<unknown>
}

type ProductListResponse = {
  products: Product[]
  count: number
}

type ProductsPageFragmentParams = Omit<
  UseInfiniteProductsParams,
  "pageRange" | "enabled"
>

const toProductsPageFragmentParams = (
  params: ProductsPageFragmentParams,
  page: number
): ProductListParams => {
  const limit = params.limit ?? 12

  return {
    limit,
    offset: (page - 1) * limit,
    filters: params.filters,
    sort: params.sort,
    fields: params.fields,
    q: params.q,
    category: params.category,
    region_id: params.region_id,
    country_code: params.country_code,
  }
}

export const buildProductsPageFragmentInput = (
  params: ProductsPageFragmentParams,
  page: number
): ProductListParams => toProductsPageFragmentParams(params, page)

const buildProductsPageFragmentQueryKey = (
  params: ProductsPageFragmentParams,
  page: number
): readonly unknown[] =>
  storefront.queryKeys.products.list(
    buildStorefrontProductListParams(
      buildProductListQuery(toProductsPageFragmentParams(params, page))
    )
  )

/**
 * Hook for fetching infinite product lists with "load more" functionality
 */
export function useInfiniteProducts(
  params: UseInfiniteProductsParams
): UseInfiniteProductsReturn {
  const queryClient = useQueryClient()
  const enabled =
    params.enabled !== undefined ? params.enabled : !!params.region_id
  const limit = params.limit ?? 12
  const pages = Array.from(
    { length: params.pageRange.end - params.pageRange.start + 1 },
    (_, index) => params.pageRange.start + index
  )

  const queries = useQueries({
    queries: pages.map((page) => {
      const fragmentInput = buildProductListQuery(
        buildProductsPageFragmentInput(params, page)
      )

      return {
        ...storefront.hooks.products.getListQueryOptions(fragmentInput),
        enabled,
      }
    }),
  })

  const firstResolvedPage = queries.find(
    (query): query is typeof query & { data: ProductListResponse } =>
      Boolean(query.data)
  )
  const totalCount = firstResolvedPage?.data.count ?? 0
  const totalPages = limit > 0 ? Math.ceil(totalCount / limit) : 0
  const nextPage = params.pageRange.end + 1
  const nextPageQueryKey = buildProductsPageFragmentQueryKey(params, nextPage)
  const isFetchingNextPage =
    useIsFetching({
      queryKey: nextPageQueryKey,
      exact: true,
    }) > 0
  const hasNextPage = params.pageRange.end < totalPages
  const firstError = queries.find((query) => query.error)?.error
  let error: string | null = null
  if (firstError instanceof Error) {
    error = firstError.message
  } else if (firstError) {
    error = "An unknown error occurred."
  }

  const fetchNextPage = async () => {
    if (!(enabled && hasNextPage)) {
      return
    }

    const fragmentInput = buildProductListQuery(
      buildProductsPageFragmentInput(params, nextPage)
    )

    await queryClient.fetchQuery(
      storefront.hooks.products.getListQueryOptions(fragmentInput)
    )
  }

  return {
    products: queries.flatMap((query) => query.data?.products ?? []),
    isLoading: queries.some((query) => query.isLoading),
    error,
    totalCount,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  }
}
