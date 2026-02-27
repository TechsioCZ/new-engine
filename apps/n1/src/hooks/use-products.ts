import type { StoreProduct } from "@medusajs/types"
import { PRODUCT_LIMIT } from "@/lib/constants"
import { productHooks } from "./product-hooks-base"

type UseProductsProps = {
  category_id?: string[]
  page?: number
  limit?: number
  enabled?: boolean
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
  enabled,
}: UseProductsProps): UseProductsReturn {
  const result = productHooks.useProducts({
    category_id,
    page,
    limit,
    enabled,
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
  page = 1,
  limit = PRODUCT_LIMIT,
}: UseProductsProps): UseSuspenseProductsReturn {
  const result = productHooks.useSuspenseProducts({
    category_id,
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
