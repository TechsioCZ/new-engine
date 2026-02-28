import type { StoreProduct } from "@medusajs/types"
import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { PRODUCT_LIMIT } from "@/lib/constants"
import {
  buildProductQueryParams,
  type ProductQueryParams,
} from "@/lib/product-query-params"
import { extractProductListParamsFromKey } from "@/lib/query-keys"
import { productHooks } from "./product-hooks-base"

type BaseProductsProps = {
  category_id?: string[]
  q?: string
  page?: number
  limit?: number
}

type UseProductsProps = BaseProductsProps & {
  enabled?: boolean
  skipIfEmptyQuery?: boolean
}

type UseSuspenseProductsProps = BaseProductsProps

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

function areSameStringArrays(a: string[] = [], b: string[] = []): boolean {
  if (a.length !== b.length) {
    return false
  }

  return a.every((value, index) => value === b[index])
}

function shouldKeepPreviousProductsData(
  currentParams: ProductQueryParams,
  previousParams?: ProductQueryParams
): boolean {
  if (!previousParams) {
    return false
  }

  return (
    (currentParams.q ?? "") === (previousParams.q ?? "") &&
    areSameStringArrays(currentParams.category_id, previousParams.category_id) &&
    (currentParams.region_id ?? "") === (previousParams.region_id ?? "") &&
    (currentParams.country_code ?? "") === (previousParams.country_code ?? "") &&
    (currentParams.limit ?? PRODUCT_LIMIT) ===
      (previousParams.limit ?? PRODUCT_LIMIT)
  )
}

export function useProducts({
  category_id = [],
  q = "",
  page = 1,
  limit = PRODUCT_LIMIT,
  enabled,
  skipIfEmptyQuery = false,
}: UseProductsProps): UseProductsReturn {
  const regionContext = useRegionContext()
  const trimmedQuery = q.trim()
  const hasCategoryFilter = category_id.length > 0
  const hasSearchIntent = trimmedQuery.length > 0 || hasCategoryFilter
  const hasEnabledFlag = enabled ?? true
  const shouldEnableQuery =
    hasEnabledFlag && (!skipIfEmptyQuery || hasSearchIntent)
  const queryParams = buildProductQueryParams({
    category_id,
    q: trimmedQuery,
    region_id: regionContext?.region_id,
    country_code: regionContext?.country_code,
    page,
    limit,
  })

  const result = productHooks.useProducts({
    category_id,
    q: trimmedQuery,
    page,
    limit,
    enabled: shouldEnableQuery,
  }, {
    queryOptions: {
      placeholderData: (previousData, previousQuery) => {
        const previousParams = extractProductListParamsFromKey(
          previousQuery?.queryKey
        )

        return shouldKeepPreviousProductsData(queryParams, previousParams)
          ? previousData
          : undefined
      },
    },
  })

  return {
    products: result.products,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isSuccess: result.isSuccess,
    error: result.error,
    totalCount: result.totalCount,
    currentPage: result.currentPage,
    totalPages: result.totalPages,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  }
}

export function useSuspenseProducts({
  category_id = [],
  q = "",
  page = 1,
  limit = PRODUCT_LIMIT,
}: UseSuspenseProductsProps): UseSuspenseProductsReturn {
  const trimmedQuery = q.trim()
  const result = productHooks.useSuspenseProducts({
    category_id,
    q: trimmedQuery,
    page,
    limit,
  })

  return {
    products: result.products,
    isFetching: result.isFetching,
    totalCount: result.totalCount,
    currentPage: result.currentPage,
    totalPages: result.totalPages,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
  }
}
