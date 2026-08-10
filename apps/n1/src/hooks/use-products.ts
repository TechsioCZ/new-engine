import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { cacheConfig } from "@/lib/cache-config"
import { PRODUCT_LIMIT } from "@/lib/constants"
import { logQuery } from "@/lib/loggers/cache"
import { fetchLogger } from "@/lib/loggers/fetch"
import { buildProductQueryParams } from "@/lib/product-query-params"
import { queryKeys } from "@/lib/query-keys"
import { getProducts } from "@/services/product-service"
import type { ProductListProduct } from "@/types/product"

import { useRegion, useSuspenseRegion } from "./use-region"

interface UseProductsProps {
  category_id?: string[]
  page?: number
  limit?: number
}

interface UseProductsReturn {
  products: ProductListProduct[]
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

interface UseSuspenseProductsReturn {
  products: ProductListProduct[]
  isFetching: boolean
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

const getCategoryLabel = (categoryIds: string[]): string => {
  const label = categoryIds[0]?.slice(-6)
  return label === "" ? "all" : (label ?? "all")
}

const fetchProductsWithLogging = async (
  params: Parameters<typeof getProducts>[0],
  signal: AbortSignal | undefined,
  categoryIds: string[],
): ReturnType<typeof getProducts> => {
  const start = performance.now()
  const result = await getProducts(params, signal)
  if (process.env.NODE_ENV === "development") {
    fetchLogger.current(
      getCategoryLabel(categoryIds),
      performance.now() - start,
    )
  }
  return result
}

export const useProducts = ({
  category_id = [],
  page = 1,
  limit = PRODUCT_LIMIT,
}: UseProductsProps): UseProductsReturn => {
  const { regionId, countryCode } = useRegion()

  const hasRegion = regionId !== undefined && regionId !== ""
  const queryParams = buildProductQueryParams({
    category_id,
    country_code: countryCode,
    limit,
    page,
    ...(hasRegion ? { region_id: regionId } : {}),
  })

  const { data, isLoading, error, dataUpdatedAt, isFetching, isSuccess } =
    useQuery({
      enabled: hasRegion,
      queryFn: async ({ signal }) =>
        await fetchProductsWithLogging(queryParams, signal, category_id),
      queryKey: queryKeys.products.list(queryParams),
      ...cacheConfig.semiStatic,
    })

  // Enhanced dev logging with cache-logger
  if (process.env.NODE_ENV === "development") {
    const categoryName = getCategoryLabel(category_id)
    const operation = `useProducts(${categoryName} p${page})`

    logQuery(operation, queryKeys.products.list(queryParams), {
      dataUpdatedAt,
      isFetching,
      isLoading,
      isSuccess,
    })
  }

  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)
  const errorMessage = error?.message ?? null

  return {
    currentPage: page,
    error: errorMessage,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    isFetching,
    isLoading,
    isSuccess,
    products: data?.products ?? [],
    totalCount,
    totalPages,
  }
}

export const useSuspenseProducts = ({
  category_id = [],
  page = 1,
  limit = PRODUCT_LIMIT,
}: UseProductsProps): UseSuspenseProductsReturn => {
  const { regionId, countryCode } = useSuspenseRegion()

  if (regionId === undefined || regionId === "" || countryCode === "") {
    throw new Error("Region is required for product queries")
  }

  const queryParams = buildProductQueryParams({
    category_id,
    country_code: countryCode,
    limit,
    page,
    region_id: regionId,
  })

  const { data, isFetching, dataUpdatedAt } = useSuspenseQuery({
    queryFn: async ({ signal }) =>
      await fetchProductsWithLogging(queryParams, signal, category_id),
    queryKey: queryKeys.products.list(queryParams),
    ...cacheConfig.semiStatic,
  })

  if (process.env.NODE_ENV === "development") {
    const categoryName = getCategoryLabel(category_id)
    const operation = `useSuspenseProducts(${categoryName} p${page})`

    logQuery(operation, queryKeys.products.list(queryParams), {
      dataUpdatedAt,
      isFetching,
      isSuccess: true,
    })
  }

  const totalCount = data?.count ?? 0
  const totalPages = Math.ceil(totalCount / limit)

  return {
    currentPage: page,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    isFetching,
    products: data?.products ?? [],
    totalCount,
    totalPages,
  }
}
