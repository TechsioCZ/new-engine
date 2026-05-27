import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import {
  ACTION_REQUIRED_DEFAULT_LIST_LIMIT,
  ACTION_REQUIRED_DEFAULT_LIST_OFFSET,
} from "./medusa-service"
import { createActionRequiredQueryKeys } from "./query-keys"
import type {
  ActionRequiredListInput,
  ActionRequiredListParams,
  ActionRequiredOrdersResponse,
  ActionRequiredQueryKeys,
  ActionRequiredService,
  ActionRequiredSummary,
  ActionRequiredSummaryInput,
  PendingB2BCustomersResponse,
} from "./types"

type QueryOptionsInput<TData> = {
  cacheStrategy?: CacheStrategy
  queryOptions?: ReadQueryOptions<TData>
}

export type ActionRequiredQueryOptionsFactory = {
  getCustomersQueryOptions: (
    input?: ActionRequiredListInput,
    options?: QueryOptionsInput<PendingB2BCustomersResponse>
  ) => QueryFactoryOptions<PendingB2BCustomersResponse>
  getOrdersQueryOptions: (
    input?: ActionRequiredListInput,
    options?: QueryOptionsInput<ActionRequiredOrdersResponse>
  ) => QueryFactoryOptions<ActionRequiredOrdersResponse>
  getSummaryQueryOptions: (
    input?: ActionRequiredSummaryInput,
    options?: QueryOptionsInput<ActionRequiredSummary>
  ) => QueryFactoryOptions<ActionRequiredSummary>
}

export type CreateActionRequiredQueryOptionsFactoryConfig = {
  cacheConfig?: CacheConfig
  queryKeyNamespace?: QueryNamespace
  queryKeys?: ActionRequiredQueryKeys
  service: ActionRequiredService
}

export function buildActionRequiredListParams(
  input: ActionRequiredListInput = {}
): ActionRequiredListParams {
  return {
    limit: input.limit ?? ACTION_REQUIRED_DEFAULT_LIST_LIMIT,
    offset: input.offset ?? ACTION_REQUIRED_DEFAULT_LIST_OFFSET,
  }
}

export function createActionRequiredQueryOptionsFactory({
  cacheConfig,
  queryKeyNamespace = "admin-data",
  queryKeys,
  service,
}: CreateActionRequiredQueryOptionsFactoryConfig): ActionRequiredQueryOptionsFactory {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createActionRequiredQueryKeys(queryKeyNamespace)

  function resolveCacheOptions(strategy: CacheStrategy) {
    return resolvedCacheConfig[strategy]
  }

  return {
    getCustomersQueryOptions(input = {}, options = {}) {
      const params = buildActionRequiredListParams(input)
      const cacheOptions = resolveCacheOptions(
        options.cacheStrategy ?? "realtime"
      )

      return {
        queryFn: ({ signal }) => service.getCustomers(params, signal),
        queryKey: resolvedQueryKeys.customers(params),
        ...cacheOptions,
        ...options.queryOptions,
      }
    },
    getOrdersQueryOptions(input = {}, options = {}) {
      const params = buildActionRequiredListParams(input)
      const cacheOptions = resolveCacheOptions(
        options.cacheStrategy ?? "realtime"
      )

      return {
        queryFn: ({ signal }) => service.getOrders(params, signal),
        queryKey: resolvedQueryKeys.orders(params),
        ...cacheOptions,
        ...options.queryOptions,
      }
    },
    getSummaryQueryOptions(_input = {}, options = {}) {
      const params = {}
      const cacheOptions = resolveCacheOptions(
        options.cacheStrategy ?? "realtime"
      )

      return {
        queryFn: ({ signal }) => service.getSummary(params, signal),
        queryKey: resolvedQueryKeys.summary(params),
        ...cacheOptions,
        ...options.queryOptions,
      }
    },
  }
}
