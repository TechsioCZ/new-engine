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
export function useProducts(params: UseProductsParams = {}): UseProductsReturn {
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
    enabled: enabled !== undefined ? enabled : !!region_id,
    queryFn: async () =>
      getProducts({
        limit,
        offset,
        filters,
        sort,
        fields,
        q,
        category,
        region_id,
      }),
    queryKey: queryKeys.products.list({
      page,
      limit,
      filters,
      sort,
      region_id,
      q,
      category,
    }),
    ...cacheConfig.semiStatic,
  })

  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  return {
    currentPage: page,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    isLoading,
    products: data?.products || [],
    totalCount,
    totalPages,
  }
}

/**
 * Hook for fetching a single product by handle
 */
export function useProduct(handle: string, regionId?: string) {
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    enabled: !!handle,
    queryFn: async () => getProduct(handle, regionId),
    queryKey: queryKeys.product(handle, regionId),
    ...cacheConfig.semiStatic,
  })

  return {
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    isLoading,
    product,
  }
}
