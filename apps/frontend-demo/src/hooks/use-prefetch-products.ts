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

export function usePrefetchProducts(options?: UsePrefetchProductsOptions) {
  const { selectedRegion } = useRegions()
  const queryClient = useQueryClient()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

  const prefetchProducts = (params?: Omit<ProductListParams, "region_id">) => {
    if (!(enabled && selectedRegion?.id)) {
      return
    }

    const queryParams = {
      ...params,
      region_id: selectedRegion.id,
    }

    void queryClient.prefetchQuery({
      queryFn: async () => await getProducts(queryParams),
      queryKey: queryKeys.products.list({
        category: params?.category,
        filters: params?.filters,
        limit: params?.limit,
        page: params?.offset
          ? Math.floor(params.offset / (params.limit || DEFAULT_LIMIT)) + 1
          : 1,
        q: params?.q,
        region_id: selectedRegion.id,
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
      sort: "newest", // Add default sort
    })
  }

  // Prefetch next page of current query
  const prefetchNextPage = (
    currentParams: ProductListParams,
    currentPage: number,
  ) => {
    const limit = currentParams.limit || DEFAULT_LIMIT
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
