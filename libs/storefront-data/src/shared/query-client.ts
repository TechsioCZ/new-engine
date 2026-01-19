import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from "@tanstack/react-query"

export type QueryClientConfig = NonNullable<
  ConstructorParameters<typeof QueryClient>[0]
>

const defaultQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error: unknown) => {
        const status =
          typeof error === "object" && error !== null
            ? (error as { status?: number }).status
            : undefined
        if (status && status >= 400 && status < 500) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: (attemptIndex) =>
        Math.min(1000 * 2 ** attemptIndex, 30_000),
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
    dehydrate: {
      shouldDehydrateQuery: (query) =>
        defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      shouldRedactErrors: () => false,
    },
  },
}

const mergeQueryClientConfig = (
  baseConfig: QueryClientConfig,
  overrides?: QueryClientConfig
): QueryClientConfig => {
  if (!overrides) {
    return baseConfig
  }

  return {
    ...baseConfig,
    ...overrides,
    defaultOptions: {
      ...baseConfig.defaultOptions,
      ...overrides.defaultOptions,
      queries: {
        ...baseConfig.defaultOptions?.queries,
        ...overrides.defaultOptions?.queries,
      },
      mutations: {
        ...baseConfig.defaultOptions?.mutations,
        ...overrides.defaultOptions?.mutations,
      },
      dehydrate: {
        ...baseConfig.defaultOptions?.dehydrate,
        ...overrides.defaultOptions?.dehydrate,
      },
      hydrate: {
        ...baseConfig.defaultOptions?.hydrate,
        ...overrides.defaultOptions?.hydrate,
      },
    },
  }
}

export function createQueryClientConfig(
  overrides?: QueryClientConfig
): QueryClientConfig {
  return mergeQueryClientConfig(defaultQueryClientConfig, overrides)
}

export function makeQueryClient(overrides?: QueryClientConfig): QueryClient {
  return new QueryClient(createQueryClientConfig(overrides))
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient(overrides?: QueryClientConfig): QueryClient {
  if (isServer) {
    return makeQueryClient(overrides)
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient(overrides)
  }
  return browserQueryClient
}
