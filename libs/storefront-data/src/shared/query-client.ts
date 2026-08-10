import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query"

import { getErrorStatus } from "./medusa-errors"

const isNonProductionEnvironment = (): boolean => {
  if (typeof process === "undefined") {
    return false
  }
  const { NODE_ENV: nodeEnvironment } = process.env
  return nodeEnvironment !== "production"
}

export type QueryClientConfig = NonNullable<
  ConstructorParameters<typeof QueryClient>[0]
>

const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    dehydrate: {
      shouldDehydrateQuery: (query) =>
        defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      shouldRedactErrors: () => true,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
    queries: {
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error: unknown) => {
        const status = getErrorStatus(error)
        if (status !== undefined && status >= 400 && status < 500) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      staleTime: 60 * 1000,
    },
  },
}

/**
 * Shallow merge overrides into the base config.
 * Merges up to defaultOptions.{queries,mutations,dehydrate,hydrate}; deeper
 * nested values are replaced, not deep-merged.
 */
const mergeQueryClientConfig = (
  baseConfig: QueryClientConfig,
  overrides?: QueryClientConfig,
): QueryClientConfig => {
  if (overrides === undefined) {
    return baseConfig
  }

  return {
    ...baseConfig,
    ...overrides,
    defaultOptions: {
      ...baseConfig.defaultOptions,
      ...overrides.defaultOptions,
      dehydrate: {
        ...baseConfig.defaultOptions?.dehydrate,
        ...overrides.defaultOptions?.dehydrate,
      },
      hydrate: {
        ...baseConfig.defaultOptions?.hydrate,
        ...overrides.defaultOptions?.hydrate,
      },
      mutations: {
        ...baseConfig.defaultOptions?.mutations,
        ...overrides.defaultOptions?.mutations,
      },
      queries: {
        ...baseConfig.defaultOptions?.queries,
        ...overrides.defaultOptions?.queries,
      },
    },
  }
}

export const createQueryClientConfig = (
  overrides?: QueryClientConfig,
): QueryClientConfig =>
  mergeQueryClientConfig(defaultQueryClientConfig, overrides)

export const makeQueryClient = (overrides?: QueryClientConfig): QueryClient =>
  new QueryClient(createQueryClientConfig(overrides))

let browserQueryClient: QueryClient | undefined

export const getQueryClient = (overrides?: QueryClientConfig): QueryClient => {
  if (typeof window === "undefined") {
    return makeQueryClient(overrides)
  }
  if (
    browserQueryClient !== undefined &&
    overrides !== undefined &&
    isNonProductionEnvironment()
  ) {
    console.warn(
      "[getQueryClient] Browser QueryClient already exists; overrides will be ignored. " +
        "Pass overrides only on first initialisation or use makeQueryClient for a fresh instance.",
    )
  }
  browserQueryClient ??= makeQueryClient(overrides)
  return browserQueryClient
}
