import type { StoreProduct } from "@medusajs/types"
import { PRODUCT_LIMIT } from "@/lib/constants"
import { buildProductQueryParams } from "@/lib/product-query-params"
import { storefront } from "./storefront-preset"

type UseProductsProps = {
  category_id?: string[]
  page?: number
  limit?: number
  enabled?: boolean
}

type UseSuspenseProductsProps = Omit<UseProductsProps, "enabled">

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

const productHooks = storefront.hooks.products

export function useProducts({
  category_id = [],
  page = 1,
  limit = PRODUCT_LIMIT,
  enabled,
}: UseProductsProps): UseProductsReturn {
  const listParams = buildProductQueryParams({
    category_id,
    page,
    limit,
  })
  const productInput =
    enabled === undefined ? listParams : { ...listParams, enabled }
  const result = productHooks.useProducts(productInput)

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
}: UseSuspenseProductsProps): UseSuspenseProductsReturn {
  const listParams = buildProductQueryParams({
    category_id,
    page,
    limit,
  })
  const result = productHooks.useSuspenseProducts(listParams)

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
