"use client"

import { useQuery } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { queryKeys } from "@/lib/query-keys"
import { getProduct, getProducts } from "@/services/product-service"
import type { ProductListParams } from "@/services/product-service"
import type { Product } from "@/types/product"

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
export const useProducts = (
  params: UseProductsParams = {},
): UseProductsReturn => {
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
  const offset = (page - 1) * limit

  const { data, isLoading, error } = useQuery({
    enabled: enabled ?? (region_id !== undefined && region_id.length > 0),
    queryFn: async () =>
      await getProducts({
        category,
        fields,
        filters,
        limit,
        offset,
        q,
        region_id,
        sort,
      }),
    queryKey: queryKeys.products.list({
      category,
      filters,
      limit,
      page,
      q,
      region_id,
      sort,
    }),
    ...cacheConfig.semiStatic,
  })

  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  return {
    currentPage: page,
    error: error?.message ?? null,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    isLoading,
    products: data?.products ?? [],
    totalCount,
    totalPages,
  }
}

/**
 * Hook for fetching a single product by handle
 */
export const useProduct = (handle: string, regionId?: string) => {
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    enabled: handle.length > 0,
    queryFn: async () => await getProduct(handle, regionId),
    queryKey: queryKeys.product(handle, regionId),
    ...cacheConfig.semiStatic,
  })

  return {
    error: error?.message ?? null,
    isLoading,
    product,
  }
}
