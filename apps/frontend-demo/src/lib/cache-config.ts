/**
 * Centralized cache configuration for React Query
 *
 * staleTime: How long data is considered fresh (no refetch needed)
 * gcTime: How long unused data stays in cache (formerly cacheTime)
 */

export const cacheConfig = {
  // categories, regions
  static: {
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 24 * 60 * 60 * 1000,
  },

  categories: {
    gcTime: Number.POSITIVE_INFINITY,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: Number.POSITIVE_INFINITY,
  },

  // product catalog, shipping options
  semiStatic: {
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  },

  // product detail, search
  dynamic: {
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  },

  // Real-time data (cart, inventory)
  realtime: {
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  },

  // User-specific data (profile, preferences)
  user: {
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  },

  // No cache (sensitive data)
  noCache: {
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
  },
} as const
