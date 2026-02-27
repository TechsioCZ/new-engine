// Centralized query keys for React Query
// This ensures consistent cache key structure across the app

import { normalizeQueryKeyParams as sdNormalizeQueryKeyParams } from "@techsio/storefront-data/shared/query-keys"
import type { ProductFilters } from "@/types/product-query"

type NormalizeQueryKeyOptions = {
  omitKeys?: readonly string[]
}

const normalizeQueryKeyParams = (
  params?: Record<string, unknown>,
  options?: NormalizeQueryKeyOptions
) =>
  sdNormalizeQueryKeyParams(
    (params ?? {}) as Record<string, unknown>,
    options
  )

type ProductListKeyParams = {
  page?: number
  limit?: number
  filters?: ProductFilters
  sort?: string
  fields?: string
  q?: string
  category?: string | string[]
  region_id?: string
  country_code?: string
  enabled?: boolean
}

type ProductInfiniteKeyParams = ProductListKeyParams & {
  pageRange?: string
  pageRangeStart?: number
}

export const queryKeys = {
  all: ["medusa"] as const,

  // Product-related queries with hierarchical structure
  products: {
    all: () => [...queryKeys.all, "products"] as const,
    lists: () => [...queryKeys.products.all(), "list"] as const,
    list: (params?: ProductListKeyParams) =>
      [
        ...queryKeys.products.lists(),
        normalizeQueryKeyParams(
          (params ?? {}) as Record<string, unknown>,
          { omitKeys: ["enabled"] }
        ),
      ] as const,
    infinite: (params?: ProductInfiniteKeyParams) =>
      [
        ...queryKeys.products.all(),
        "infinite",
        normalizeQueryKeyParams(
          (params ?? {}) as Record<string, unknown>,
          { omitKeys: ["enabled"] }
        ),
      ] as const,
    detail: (handle: string, region_id?: string, country_code?: string) =>
      [
        ...queryKeys.products.all(),
        "detail",
        handle,
        region_id,
        country_code,
      ] as const,
  },

  // Region queries
  regions: () => [...queryKeys.all, "regions"] as const,

  // Cart queries
  cartKeys: {
    all: () => [...queryKeys.all, "cart"] as const,
    active: ({ cartId }: { cartId?: string | null }) => {
      const base = [...queryKeys.cartKeys.all(), "active"] as const
      return cartId ? ([...base, cartId] as const) : base
    },
    detail: (cartId: string) =>
      [...queryKeys.cartKeys.all(), "detail", cartId] as const,
  },
  cart: (id?: string) => {
    if (id) {
      return queryKeys.cartKeys.active({ cartId: id })
    }
    return queryKeys.cartKeys.all()
  },
  cartDetail: (id: string) => queryKeys.cartKeys.detail(id),

  // Authentication queries
  auth: {
    customer: () => [...queryKeys.all, "auth", "customer"] as const,
    session: () => [...queryKeys.all, "auth", "session"] as const,
  },

  // Category queries
  categories: () => [...queryKeys.all, "categories"] as const,
  category: (handle: string) => [...queryKeys.categories(), handle] as const,
  allCategories: () => [...queryKeys.all, "all-categories"] as const,

  // Order queries
  orders: {
    all: () => [...queryKeys.all, "orders"] as const,
    list: (params?: {
      page?: number
      limit?: number
      status?: string[]
      enabled?: boolean
    }) =>
      [
        ...queryKeys.orders.all(),
        "list",
        normalizeQueryKeyParams(
          (params ?? {}) as Record<string, unknown>,
          { omitKeys: ["enabled"] }
        ),
      ] as const,
    detail: (id: string) => [...queryKeys.orders.all(), "detail", id] as const,
  },

  // Customer queries
  customer: {
    addresses: (params?: { enabled?: boolean } & Record<string, unknown>) =>
      [
        ...queryKeys.all,
        "customer",
        "addresses",
        normalizeQueryKeyParams(
          (params ?? {}) as Record<string, unknown>,
          { omitKeys: ["enabled"] }
        ),
      ] as const,
  },

  // Fulfillment queries
  fulfillment: {
    cartOptions: (cartId: string) =>
      [...queryKeys.all, "fulfillment", "cart-options", cartId] as const,
  },

  // Legacy aliases for backward compatibility
  product: (handle: string, region_id?: string, country_code?: string) =>
    queryKeys.products.detail(handle, region_id, country_code),
} as const
