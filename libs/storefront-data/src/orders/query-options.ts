import {
  type CacheConfig,
  type CacheStrategy,
  createCacheConfig,
} from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createOrderQueryKeys } from "./query-keys"
import type {
  OrderDetailInputBase,
  OrderListInputBase,
  OrderListResponse,
  OrderQueryKeys,
  OrderService,
} from "./types"

export type CreateOrderQueryOptionsFactoryConfig<
  TOrder,
  TListInput extends OrderListInputBase,
  TListParams,
  TDetailInput extends OrderDetailInputBase,
  TDetailParams,
> = {
  service: OrderService<TOrder, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: OrderQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export type OrderQueryOptionsFactory<
  TOrder,
  TListInput extends OrderListInputBase,
  TDetailInput extends OrderDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<OrderListResponse<TOrder>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TOrder | null>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TOrder | null>
}

export function createOrderQueryOptionsFactory<
  TOrder,
  TListInput extends OrderListInputBase,
  TListParams,
  TDetailInput extends OrderDetailInputBase,
  TDetailParams,
>({
  service,
  buildListParams,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateOrderQueryOptionsFactoryConfig<
  TOrder,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): OrderQueryOptionsFactory<TOrder, TListInput, TDetailInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createOrderQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  return {
    getListQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<OrderListResponse<TOrder>> => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const listParams = buildList(listInput as TListInput)
      const cacheStrategy = options?.cacheStrategy ?? "userData"

      return {
        queryKey: resolvedQueryKeys.list(listParams),
        queryFn: ({ signal }) => service.getOrders(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TOrder | null> => {
      const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const detailParams = buildDetail(detailInput as TDetailInput)
      const cacheStrategy = options?.cacheStrategy ?? "userData"

      return {
        queryKey: resolvedQueryKeys.detail(detailParams),
        queryFn: ({ signal }) => {
          if (!input.id) {
            throw new Error("Order id is required for order queries")
          }

          return service.getOrder(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
