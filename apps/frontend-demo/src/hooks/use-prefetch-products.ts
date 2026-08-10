import { useQueryClient } from "@tanstack/react-query"

import { useRegions } from "@/hooks/use-region"
import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"
import type { ProductListParams } from "@/services/product-service"

interface UsePrefetchProductsOptions {
  enabled?: boolean
  // Allow custom cache config if needed
  cacheStrategy?: keyof typeof cacheConfig
}

const DEFAULT_LIMIT = 12

export const usePrefetchProducts = (options?: UsePrefetchProductsOptions) => {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

  const prefetchProducts = (params?: Omit<ProductListParams, "region_id">) => {
    const regionId = selectedRegion?.id
    if (!enabled || regionId === undefined || regionId.length === 0) {
      return
    }

    const offset = params?.offset ?? 0
    const paginationLimit =
      params?.limit === undefined || params.limit === 0
        ? DEFAULT_LIMIT
        : params.limit
    const page = offset === 0 ? 1 : Math.floor(offset / paginationLimit) + 1
    const queryParams = {
      ...params,
      region_id: regionId,
    }

    void queryClient.prefetchQuery({
      queryFn: async () => await getProducts(queryParams),
      queryKey: queryKeys.products.list({
        category: params?.category,
        filters: params?.filters,
        limit: params?.limit,
        page,
        q: params?.q,
        region_id: regionId,
        sort: params?.sort,
      }),
      ...cacheConfig[cacheStrategy],
    })
  }

  // Prefetch default products page (first page, no filters)
  const prefetchDefaultProducts = () => {
    prefetchProducts({
      filters: {
        categories: [],
        sizes: [],
      },
      limit: DEFAULT_LIMIT,
      offset: 0,
      sort: "newest",
    })
  }

  // Prefetch products for a specific category
  const prefetchCategoryProducts = (categoryHandle: string) => {
    prefetchProducts({
      category: categoryHandle,
      limit: DEFAULT_LIMIT,
      offset: 0,
      // Keep category prefetches aligned with the default product sort.
      sort: "newest",
    })
  }

  // Prefetch next page of current query
  const prefetchNextPage = (
    currentParams: ProductListParams,
    currentPage: number,
  ) => {
    const limit =
      currentParams.limit === undefined || currentParams.limit === 0
        ? DEFAULT_LIMIT
        : currentParams.limit
    prefetchProducts({
      ...currentParams,
      offset: currentPage * limit,
    })
  }

  return {
    prefetchCategoryProducts,
    prefetchDefaultProducts,
    prefetchNextPage,
    prefetchProducts,
  }
}
