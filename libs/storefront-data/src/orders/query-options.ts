import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailQueryOptionsFactory } from "../shared/simple-list-detail-query-options"
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
  const resolvedQueryKeys =
    queryKeys ??
    createOrderQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)

  return createSimpleListDetailQueryOptionsFactory({
    getList: service.getOrders,
    getDetail: service.getOrder,
    buildListParams,
    buildDetailParams,
    queryKeys: resolvedQueryKeys,
    cacheConfig,
    defaultCacheStrategy: "userData",
    missingDetailErrorMessage: "Order id is required for order queries",
  })
}
