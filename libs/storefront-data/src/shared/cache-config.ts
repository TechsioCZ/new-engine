export interface CacheOptions {
  staleTime: number
  gcTime: number
  refetchOnWindowFocus?: boolean
  refetchOnMount?: boolean | "always"
  refetchOnReconnect?: boolean
}

export type PrefetchCacheOptions = Pick<CacheOptions, "staleTime" | "gcTime">

export interface CacheConfig {
  static: CacheOptions
  semiStatic: CacheOptions
  realtime: CacheOptions
  userData: CacheOptions
}

export type CacheStrategy = keyof CacheConfig

export type CacheConfigOverrides = {
  [Key in keyof CacheConfig]?: Partial<CacheOptions>
}

export const defaultCacheConfig: CacheConfig = {
  realtime: {
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000,
  },
  semiStatic: {
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    staleTime: 60 * 60 * 1000,
  },
  static: {
    gcTime: 7 * 24 * 60 * 60 * 1000,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    staleTime: 24 * 60 * 60 * 1000,
  },
  userData: {
    gcTime: 30 * 60 * 1000,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 5 * 60 * 1000,
  },
}

export function createCacheConfig(
  overrides: CacheConfigOverrides = {},
): CacheConfig {
  return {
    realtime: { ...defaultCacheConfig.realtime, ...overrides.realtime },
    semiStatic: { ...defaultCacheConfig.semiStatic, ...overrides.semiStatic },
    static: { ...defaultCacheConfig.static, ...overrides.static },
    userData: { ...defaultCacheConfig.userData, ...overrides.userData },
  }
}

export function getPrefetchCacheOptions(
  cacheConfig: CacheConfig,
  strategy: keyof CacheConfig,
): PrefetchCacheOptions {
  const config = cacheConfig[strategy]
  return {
    gcTime: config.gcTime,
    staleTime: config.staleTime,
  }
}
