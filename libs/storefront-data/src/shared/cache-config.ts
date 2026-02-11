export type CacheOptions = {
  staleTime: number
  gcTime: number
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean | "always"
  refetchOnReconnect?: boolean
}

export type PrefetchCacheOptions = Pick<CacheOptions, "staleTime" | "gcTime">

export type CacheConfig = {
  static: CacheOptions
  semiStatic: CacheOptions
  realtime: CacheOptions
  userData: CacheOptions
}

export type CacheConfigOverrides = {
  [Key in keyof CacheConfig]?: Partial<CacheOptions>
}

export const defaultCacheConfig: CacheConfig = {
  static: {
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  },
  semiStatic: {
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
  realtime: {
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  },
  userData: {
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  },
}

export function createCacheConfig(
  overrides: CacheConfigOverrides = {}
): CacheConfig {
  return {
    static: { ...defaultCacheConfig.static, ...overrides.static },
    semiStatic: { ...defaultCacheConfig.semiStatic, ...overrides.semiStatic },
    realtime: { ...defaultCacheConfig.realtime, ...overrides.realtime },
    userData: { ...defaultCacheConfig.userData, ...overrides.userData },
  }
}

export function getPrefetchCacheOptions(
  cacheConfig: CacheConfig,
  strategy: keyof CacheConfig
): PrefetchCacheOptions {
  const config = cacheConfig[strategy]
  return {
    staleTime: config.staleTime,
    gcTime: config.gcTime,
  }
}
