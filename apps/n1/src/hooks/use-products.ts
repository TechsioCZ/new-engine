import type { StoreProduct } from "@medusajs/types"
import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { PRODUCT_LIMIT } from "@/lib/constants"
import { logQuery } from "@/lib/loggers/cache"
import { fetchLogger } from "@/lib/loggers/fetch"
import { buildProductQueryParams } from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"

import { useRegion, useSuspenseRegion } from "./use-region"

type UseProductsProps = {
  category_id?: string[]
  page?: number
  limit?: number
}

type UseProductsReturn = {
  products: StoreProduct[]
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type UseSuspenseProductsReturn = {
  products: StoreProduct[]
  isFetching: boolean
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export function useProducts({
  category_id = [],
  page = 1,
  limit = PRODUCT_LIMIT,
}: UseProductsProps): UseProductsReturn {
  const { regionId, countryCode } = useRegion()

  const queryParams = buildProductQueryParams({
    category_id,
    ...(regionId ? { region_id: regionId } : {}),
    country_code: countryCode,
    page,
    limit,
  })

  const { data, isLoading, error, dataUpdatedAt, isFetching, isSuccess } =
    useQuery({
      queryKey: queryKeys.products.list(queryParams),
      queryFn: async ({ signal }) => {
        const start = performance.now()
        const result = await getProducts(queryParams, signal)
        const duration = performance.now() - start

        if (process.env["NODE_ENV"] === "development") {
          const categoryLabel = category_id?.[0]?.slice(-6) || "all"
          fetchLogger.current(categoryLabel, duration)
        }

        return result
      },
      enabled: !!regionId,
      ...cacheConfig.semiStatic,
    })

  // Enhanced dev logging with cache-logger
  if (process.env["NODE_ENV"] === "development" && data) {
    const categoryName = category_id?.[0]?.slice(-6) || "all"
    const operation = `useProducts(${categoryName} p${page})`

    logQuery(operation, queryKeys.products.list(queryParams), {
      isLoading,
      isFetching,
      isSuccess,
      dataUpdatedAt,
    })
  }

  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / limit)
  let errorMessage: string | null = null
  if (error instanceof Error) {
    errorMessage = error.message
  } else if (error) {
    errorMessage = String(error)
  }

  return {
    products: data?.products || [],
    isLoading,
    isFetching,
    isSuccess,
    error: errorMessage,
    totalCount,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}

export function useSuspenseProducts({
  category_id = [],
  page = 1,
  limit = PRODUCT_LIMIT,
}: UseProductsProps): UseSuspenseProductsReturn {
  const { regionId, countryCode } = useSuspenseRegion()

  if (!(regionId && countryCode)) {
    throw new Error("Region is required for product queries")
  }

  const queryParams = buildProductQueryParams({
    category_id,
    ...(regionId ? { region_id: regionId } : {}),
    country_code: countryCode,
    page,
    limit,
  })

  const { data, isFetching, dataUpdatedAt } = useSuspenseQuery({
    queryKey: queryKeys.products.list(queryParams),
    queryFn: async ({ signal }) => {
      const start = performance.now()
      const result = await getProducts(queryParams, signal)
      const duration = performance.now() - start

      if (process.env["NODE_ENV"] === "development") {
        const categoryLabel = category_id?.[0]?.slice(-6) || "all"
        fetchLogger.current(categoryLabel, duration)
      }

      return result
    },
    ...cacheConfig.semiStatic,
  })

  if (process.env["NODE_ENV"] === "development" && data) {
    const categoryName = category_id?.[0]?.slice(-6) || "all"
    const operation = `useSuspenseProducts(${categoryName} p${page})`

    logQuery(operation, queryKeys.products.list(queryParams), {
      isFetching,
      isSuccess: true,
      dataUpdatedAt,
    })
  }

  const totalCount = data?.count || 0
  const totalPages = Math.ceil(totalCount / limit)

  return {
    products: data?.products || [],
    isFetching,
    totalCount,
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  }
}
