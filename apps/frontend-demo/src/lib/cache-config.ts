/**
 * Centralized cache configuration for React Query
 *
 * staleTime: How long data is considered fresh (no refetch needed)
 * gcTime: How long unused data stays in cache (formerly cacheTime)
 */

export const cacheConfig = {
  // Categories.
  categories: {
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  },

  // Product detail and search.
  dynamic: {
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  },

  // No cache for sensitive data.
  noCache: {
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  },

  // Real-time data such as cart and inventory.
  realtime: {
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  },

  // Product catalog and shipping options.
  semiStatic: {
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  },

  // Regions and other static data.
  static: {
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 24 * 60 * 60 * 1000,
  },

  // User-specific data such as profile and preferences.
  user: {
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  },
} as const
