export type CacheOptions = {
  gcTime: number
  refetchOnMount?: boolean | "always"
  refetchOnReconnect?: boolean
  refetchOnWindowFocus?: boolean
  staleTime: number
}

export type CacheConfig = {
  operational: CacheOptions
  realtime: CacheOptions
  static: CacheOptions
}

export type CacheStrategy = keyof CacheConfig

export type CacheConfigOverrides = {
  [Key in keyof CacheConfig]?: Partial<CacheOptions>
}

export const defaultCacheConfig: CacheConfig = {
  operational: {
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  },
  realtime: {
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
  },
  static: {
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 24 * 60 * 60 * 1000,
  },
}

export function createCacheConfig(
  overrides: CacheConfigOverrides = {}
): CacheConfig {
  return {
    operational: {
      ...defaultCacheConfig.operational,
      ...overrides.operational,
    },
    realtime: {
      ...defaultCacheConfig.realtime,
      ...overrides.realtime,
    },
    static: {
      ...defaultCacheConfig.static,
      ...overrides.static,
    },
  }
}
