import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import type { CacheConfig } from "@techsio/storefront-data/shared/cache-config"
import { useRegions } from "@/hooks/use-region"
import { resolveRegionCountryCode } from "@/lib/region-utils"
import type { ProductListParams } from "@/types/product-query"
import {
  buildStorefrontProductListParams,
  fetchStorefrontProducts,
  storefrontProductQueryKeys,
  type StorefrontProductListInput,
  useStorefrontPrefetchProducts,
} from "./storefront-products"

interface UsePrefetchProductsOptions {
  enabled?: boolean
  cacheStrategy?: keyof CacheConfig
}

const DEFAULT_LIMIT = 12
type PrefetchedProductList = Awaited<ReturnType<typeof fetchStorefrontProducts>>
type PrefetchedInfiniteProducts = {
  pages: PrefetchedProductList[]
  pageParams: number[]
}

export function usePrefetchProducts(options?: UsePrefetchProductsOptions) {
  const queryClient = useQueryClient()
  const { selectedRegion } = useRegions()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
  const { prefetchProducts: sdPrefetchProducts } = useStorefrontPrefetchProducts({
    cacheStrategy,
  })

  const seedInfiniteProductsCache = useCallback(
    (input: StorefrontProductListInput) => {
      const listParams = buildStorefrontProductListParams(input)

      if (listParams.offset !== 0) {
        return
      }

      const listQueryKey = storefrontProductQueryKeys.list(listParams)
      const prefetchedList =
        queryClient.getQueryData<PrefetchedProductList>(listQueryKey)

      if (!prefetchedList) {
        return
      }

      const buildInfiniteQueryKey = storefrontProductQueryKeys.infinite
      if (!buildInfiniteQueryKey) {
        return
      }

      const infiniteQueryKey = buildInfiniteQueryKey(listParams)

      queryClient.setQueryData<PrefetchedInfiniteProducts | undefined>(
        infiniteQueryKey,
        (existing) =>
          existing ?? {
            pages: [prefetchedList],
            pageParams: [listParams.offset],
          }
      )
    },
    [queryClient]
  )

  const prefetchProducts = useCallback(
    (params?: Omit<ProductListParams, "region_id">) => {
      if (!(enabled && selectedRegion?.id)) return

      const limit = params?.limit ?? DEFAULT_LIMIT
      const offset = params?.offset ?? 0
      const page = Math.floor(offset / limit) + 1
      const countryCode = resolveRegionCountryCode(selectedRegion)

      const queryParams: StorefrontProductListInput = {
        ...params,
        limit,
        offset,
        page,
        region_id: selectedRegion.id,
        country_code: countryCode,
      }

      void sdPrefetchProducts(queryParams, {
        cacheStrategy,
      })
        .then(() => {
          seedInfiniteProductsCache(queryParams)
        })
        .catch((error) => {
          console.warn("Product prefetch failed", {
            error,
            queryParams,
          })
        })
    },
    [
      selectedRegion,
      enabled,
      sdPrefetchProducts,
      cacheStrategy,
      seedInfiniteProductsCache,
    ]
  )

  // Prefetch default products page (first page, no filters)
  const prefetchDefaultProducts = useCallback(() => {
    prefetchProducts({
      limit: DEFAULT_LIMIT,
      offset: 0,
      filters: {
        categories: [],
        sizes: [],
      },
      sort: "newest",
    })
  }, [prefetchProducts])

  // Prefetch products for a specific category
  const prefetchCategoryProducts = useCallback(
    (categoryHandle: string) => {
      prefetchProducts({
        category: categoryHandle,
        limit: DEFAULT_LIMIT,
        offset: 0,
        sort: "newest", // Add default sort
      })
    },
    [prefetchProducts]
  )

  // Prefetch next page of current query
  const prefetchNextPage = useCallback(
    (currentParams: ProductListParams, currentPage: number) => {
      const limit = currentParams.limit || DEFAULT_LIMIT
      prefetchProducts({
        ...currentParams,
        offset: currentPage * limit,
      })
    },
    [prefetchProducts]
  )

  return {
    prefetchProducts,
    prefetchDefaultProducts,
    prefetchCategoryProducts,
    prefetchNextPage,
  }
}
