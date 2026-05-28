import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import {
  ORDER_EXPEDITION_DEFAULT_LIST_LIMIT,
  ORDER_EXPEDITION_DEFAULT_LIST_OFFSET,
} from "./medusa-service"
import { createOrderExpeditionQueryKeys } from "./query-keys"
import type {
  OrderBusinessStatusesByIdsInput,
  OrderBusinessStatusesByIdsParams,
  OrderBusinessStatusesByIdsResponse,
  OrderExpeditionCarriersResponse,
  OrderExpeditionOrdersInput,
  OrderExpeditionOrdersParams,
  OrderExpeditionOrdersResponse,
  OrderExpeditionQueryKeys,
  OrderExpeditionService,
} from "./types"

type QueryOptionsInput<TData> = {
  cacheStrategy?: CacheStrategy
  queryOptions?: ReadQueryOptions<TData>
}

export type OrderExpeditionQueryOptionsFactory = {
  getBusinessStatusesByIdsQueryOptions: (
    input: OrderBusinessStatusesByIdsInput,
    options?: QueryOptionsInput<OrderBusinessStatusesByIdsResponse>
  ) => QueryFactoryOptions<OrderBusinessStatusesByIdsResponse>
  getCarriersQueryOptions: (
    options?: QueryOptionsInput<OrderExpeditionCarriersResponse>
  ) => QueryFactoryOptions<OrderExpeditionCarriersResponse>
  getOrdersQueryOptions: (
    input?: OrderExpeditionOrdersInput,
    options?: QueryOptionsInput<OrderExpeditionOrdersResponse>
  ) => QueryFactoryOptions<OrderExpeditionOrdersResponse>
}

export type CreateOrderExpeditionQueryOptionsFactoryConfig = {
  cacheConfig?: CacheConfig
  queryKeyNamespace?: QueryNamespace
  queryKeys?: OrderExpeditionQueryKeys
  service: OrderExpeditionService
}

export function normalizeOrderIds(ids: readonly string[]) {
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))]
}

export function normalizeOrderIdsForLookup(ids: readonly string[]) {
  return normalizeOrderIds(ids).sort((a, b) => a.localeCompare(b))
}

export function buildOrderExpeditionOrdersParams(
  input: OrderExpeditionOrdersInput = {}
): OrderExpeditionOrdersParams {
  return {
    businessStatus: input.businessStatus ?? "all",
    carrier: input.carrier ?? "all",
    limit: input.limit ?? ORDER_EXPEDITION_DEFAULT_LIST_LIMIT,
    offset: input.offset ?? ORDER_EXPEDITION_DEFAULT_LIST_OFFSET,
  }
}

export function buildOrderBusinessStatusesByIdsParams(
  input: OrderBusinessStatusesByIdsInput
): OrderBusinessStatusesByIdsParams {
  return {
    ids: normalizeOrderIdsForLookup(input.ids),
  }
}

export function createOrderExpeditionQueryOptionsFactory({
  cacheConfig,
  queryKeyNamespace = "admin-data",
  queryKeys,
  service,
}: CreateOrderExpeditionQueryOptionsFactoryConfig): OrderExpeditionQueryOptionsFactory {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createOrderExpeditionQueryKeys(queryKeyNamespace)

  function resolveCacheOptions(strategy: CacheStrategy) {
    return resolvedCacheConfig[strategy]
  }

  return {
    getBusinessStatusesByIdsQueryOptions(input, options = {}) {
      const params = buildOrderBusinessStatusesByIdsParams(input)
      const cacheOptions = resolveCacheOptions(
        options.cacheStrategy ?? "realtime"
      )

      return {
        queryFn: ({ signal }) =>
          service.getBusinessStatusesByIds(params, signal),
        queryKey: resolvedQueryKeys.businessStatusesByIds(params),
        ...cacheOptions,
        ...options.queryOptions,
      }
    },
    getCarriersQueryOptions(options = {}) {
      const cacheOptions = resolveCacheOptions(
        options.cacheStrategy ?? "static"
      )

      return {
        queryFn: ({ signal }) => service.getCarriers(signal),
        queryKey: resolvedQueryKeys.carriers(),
        ...cacheOptions,
        ...options.queryOptions,
      }
    },
    getOrdersQueryOptions(input = {}, options = {}) {
      const params = buildOrderExpeditionOrdersParams(input)
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
  }
}
