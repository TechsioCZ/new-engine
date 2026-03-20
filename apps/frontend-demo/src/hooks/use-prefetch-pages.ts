"use client"

import { storefront } from "@/lib/storefront"
import {
  buildProductListQuery,
  type ProductFilters,
} from "@/services/product-service"

type UsePrefetchPagesParams = {
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  productsLength: number
  pageSize: number
  sortBy: string | undefined
  totalPages: number
  regionId: string | undefined
  searchQuery: string | undefined
  filters: ProductFilters
}

type StorefrontProductsInput = Parameters<
  typeof storefront.hooks.products.useProducts
>[0]

export function usePrefetchPages({
  currentPage,
  hasNextPage,
  hasPrevPage,
  productsLength,
  pageSize,
  sortBy,
  totalPages,
  regionId,
  searchQuery,
  filters,
}: UsePrefetchPagesParams) {
  const { offset: _offset, ...baseInput } = buildProductListQuery({
    limit: pageSize,
    filters,
    sort: sortBy === "relevance" ? undefined : sortBy,
    q: searchQuery || undefined,
    region_id: regionId,
  })

  storefront.hooks.products.usePrefetchPages({
    enabled: productsLength > 0,
    shouldPrefetch: !!regionId && productsLength > 0,
    baseInput: {
      ...baseInput,
      limit: pageSize,
    } as StorefrontProductsInput,
    currentPage,
    hasNextPage,
    hasPrevPage,
    totalPages,
    pageSize,
    cacheStrategy: "semiStatic",
  })
}
