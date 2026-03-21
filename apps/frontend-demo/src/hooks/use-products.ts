"use client"

import { storefront } from "@/lib/storefront"
import {
  buildProductDetailQuery,
  buildProductListQuery,
  type ProductFilters,
} from "@/services/product-service"
import type { Product } from "@/types/product"

type UseProductsParams = {
  page?: number
  limit?: number
  filters?: ProductFilters
  sort?: string
  fields?: string
  q?: string
  category?: string | string[]
  region_id?: string
  enabled?: boolean
}

type UseProductsReturn = {
  products: Product[]
  isLoading: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

type StorefrontProductsInput = Parameters<
  typeof storefront.hooks.products.useProducts
>[0]
type StorefrontProductInput = Parameters<
  typeof storefront.hooks.products.useProduct
>[0]

const toStorefrontProductsInput = (
  params: UseProductsParams
): StorefrontProductsInput => {
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
  const query = buildProductListQuery({
    limit,
    offset,
    filters,
    sort,
    fields,
    q,
    category,
    region_id,
  })

  return {
    ...query,
    enabled: enabled !== undefined ? enabled : !!region_id,
  } as StorefrontProductsInput
}

export function useProducts(params: UseProductsParams = {}): UseProductsReturn {
  const {
    products,
    isLoading,
    error,
    totalCount,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
  } = storefront.hooks.products.useProducts(toStorefrontProductsInput(params))

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

export function useProduct(handle: string, regionId?: string) {
  const input = buildProductDetailQuery(
    handle,
    regionId
  ) as StorefrontProductInput
  const { product, isLoading, error } =
    storefront.hooks.products.useProduct(input)

  return {
    product,
    isLoading,
    error,
  }
}
