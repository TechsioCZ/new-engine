import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config"

export const storefrontCacheConfig = createCacheConfig({
  realtime: {
    gcTime: 30 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 10 * 1000,
  },
  semiStatic: {
    gcTime: 12 * 60 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  },
  static: {
    gcTime: 7 * 24 * 60 * 60 * 1000,
    staleTime: 12 * 60 * 60 * 1000,
  },
  userData: {
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 60 * 1000,
  },
})
