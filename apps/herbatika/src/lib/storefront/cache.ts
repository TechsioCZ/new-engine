import { createCacheConfig } from "@techsio/storefront-data/shared/cache-config";

export const storefrontCacheConfig = createCacheConfig({
  static: {
    staleTime: 12 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
  },
  semiStatic: {
    staleTime: 10 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
  },
  realtime: {
    staleTime: 10 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  },
  userData: {
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
  },
});
