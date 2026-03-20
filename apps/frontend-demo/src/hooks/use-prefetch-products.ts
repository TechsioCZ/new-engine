"use client"

import { useCallback } from "react"
import { storefront } from "@/lib/storefront"
import {
  buildProductListQuery,
  type ProductListParams,
} from "@/services/product-service"
import { useRegions } from "./use-region"

type UsePrefetchProductsOptions = {
  enabled?: boolean
  cacheStrategy?: "semiStatic" | "dynamic" | "static" | "realtime"
}

const DEFAULT_LIMIT = 12

type StorefrontProductsInput = Parameters<
  typeof storefront.hooks.products.useProducts
>[0]

const toStorefrontProductsInput = (
  params: ProductListParams
): StorefrontProductsInput => {
  const limit = params.limit ?? DEFAULT_LIMIT
  const offset = params.offset ?? 0
  const page = Math.floor(offset / limit) + 1

  return {
    ...buildProductListQuery({
      ...params,
      limit,
      offset,
    }),
    page,
    limit,
  } as StorefrontProductsInput
}

export function usePrefetchProducts(options?: UsePrefetchProductsOptions) {
  const { selectedRegion } = useRegions()
  const enabled = options?.enabled ?? true
  const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
  const { prefetchProducts: runPrefetchProducts } =
    storefront.hooks.products.usePrefetchProducts({
      cacheStrategy,
      skipIfCached: true,
      skipMode: "any",
    })

  const prefetchProducts = useCallback(
    (params?: Omit<ProductListParams, "region_id">) => {
      if (!(enabled && selectedRegion?.id)) {
        return Promise.resolve()
      }

      return runPrefetchProducts(
        toStorefrontProductsInput({
          ...params,
          region_id: selectedRegion.id,
        })
      )
    },
    [enabled, runPrefetchProducts, selectedRegion?.id]
  )

  const prefetchDefaultProducts = useCallback(
    () =>
      prefetchProducts({
        limit: DEFAULT_LIMIT,
        offset: 0,
        filters: {
          categories: [],
          sizes: [],
        },
        sort: "newest",
      }),
    [prefetchProducts]
  )

  const prefetchCategoryProducts = useCallback(
    (category: string | string[]) =>
      prefetchProducts({
        category,
        limit: DEFAULT_LIMIT,
        offset: 0,
        sort: "newest",
      }),
    [prefetchProducts]
  )

  const prefetchNextPage = useCallback(
    (currentParams: ProductListParams, currentPage: number) => {
      const limit = currentParams.limit ?? DEFAULT_LIMIT
      return prefetchProducts({
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
