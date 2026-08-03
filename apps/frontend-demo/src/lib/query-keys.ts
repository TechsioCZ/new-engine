// Centralized query keys for React Query
// This ensures consistent cache key structure across the app

export const queryKeys = {
  all: ["medusa"] as const,

  // Product-related queries with hierarchical structure
  products: {
    all: () => [...queryKeys.all, "products"] as const,
    lists: () => [...queryKeys.products.all(), "list"] as const,
    list: (params?: {
      page?: number | undefined
      limit?: number | undefined
      filters?: unknown
      sort?: string | undefined
      fields?: string | undefined
      q?: string | undefined
      category?: string | string[] | undefined
      region_id?: string | undefined
    }) => [...queryKeys.products.lists(), params || {}] as const,
    infinite: (params?: {
      page?: number | undefined
      pageRange?: string | undefined
      pageRangeStart?: number | undefined
      limit?: number | undefined
      filters?: unknown
      sort?: string | undefined
      q?: string | undefined
      category?: string | string[] | undefined
      region_id?: string | undefined
    }) => [...queryKeys.products.all(), "infinite", params || {}] as const,
    detail: (handle: string, region_id?: string) =>
      [...queryKeys.products.all(), "detail", handle, region_id] as const,
  },

  // Region queries
  regions: () => [...queryKeys.all, "regions"] as const,

  // Cart queries
  cart: (id?: string) => {
    const base = [...queryKeys.all, "cart"] as const
    return id ? ([...base, id] as const) : base
  },

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
    list: (params?: { page?: number; limit?: number; status?: string[] }) =>
      [...queryKeys.orders.all(), "list", params || {}] as const,
    detail: (id: string) => [...queryKeys.orders.all(), "detail", id] as const,
  },

  // Customer queries
  customer: {
    addresses: () => [...queryKeys.all, "customer", "addresses"] as const,
  },

  // Fulfillment queries
  fulfillment: {
    cartOptions: (cartId: string) =>
      [...queryKeys.all, "fulfillment", "cart-options", cartId] as const,
  },

  // Legacy aliases for backward compatibility
  product: (handle: string, region_id?: string) =>
    queryKeys.products.detail(handle, region_id),
} as const
