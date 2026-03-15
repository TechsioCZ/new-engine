"use client"

import type { Product } from "@/types/product"
import type { ProductListParams } from "@/types/product-query"
import {
  useStorefrontProduct,
  useStorefrontProducts,
} from "./storefront-products"
import { useRegions } from "./use-region"

interface UseProductsParams extends ProductListParams {
  page?: number
  enabled?: boolean
}

interface UseProductsReturn {
  products: Product[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

/**
 * Hook for fetching product lists with pagination and filtering
 */
export function useProducts(params: UseProductsParams = {}): UseProductsReturn {
  const { selectedRegion } = useRegions()
  const {
    page = 1,
    limit = 20,
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
  const {
    products,
    isLoading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = useStorefrontProducts(
    {
      page,
      limit,
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
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  }
}

/**
 * Hook for fetching a single product by handle
 */
export function useProduct(handle: string, regionId?: string) {
  const { selectedRegion } = useRegions()
  const resolvedRegionId = regionId ?? selectedRegion?.id
  const { product, isLoading, error } = useStorefrontProduct({
    handle,
    region_id: resolvedRegionId,
    enabled: !!handle && !!resolvedRegionId,
  })

  return {
    product,
    isLoading,
    error,
  }
}
