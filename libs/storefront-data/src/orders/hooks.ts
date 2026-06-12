import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailHooks } from "../shared/simple-list-detail-hooks"
import { createOrderQueryKeys } from "./query-keys"
import { createOrderQueryOptionsFactory } from "./query-options"
import type {
  OrderDetailInputBase,
  OrderListInputBase,
  OrderListResponse,
  OrderQueryKeys,
  OrderService,
  UseOrderResult,
  UseOrdersResult,
  UseSuspenseOrderResult,
  UseSuspenseOrdersResult,
} from "./types"

type SuspenseListInput<TInput extends OrderListInputBase> = Omit<
  TInput,
  "enabled"
>
type SuspenseDetailInput<TInput extends OrderDetailInputBase> = Omit<
  TInput,
  "enabled"
>

export type CreateOrderHooksConfig<
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
  defaultPageSize?: number
}

export type OrderHooks<
  TOrder,
  TListInput extends OrderListInputBase,
  TDetailInput extends OrderDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
    }
  ) => QueryFactoryOptions<OrderListResponse<TOrder>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TOrder | null> }
  ) => QueryFactoryOptions<TOrder | null>
  useOrders: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
    }
  ) => UseOrdersResult<TOrder>
  useSuspenseOrders: (
    input: SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<OrderListResponse<TOrder>>
    }
  ) => UseSuspenseOrdersResult<TOrder>
  useOrder: (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TOrder | null> }
  ) => UseOrderResult<TOrder>
  useSuspenseOrder: (
    input: SuspenseDetailInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TOrder | null> }
  ) => UseSuspenseOrderResult<TOrder>
}

export function createOrderHooks<
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
  defaultPageSize = 20,
}: CreateOrderHooksConfig<
  TOrder,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): OrderHooks<TOrder, TListInput, TDetailInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createOrderQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)
  const { getListQueryOptions, getDetailQueryOptions } =
    createOrderQueryOptionsFactory({
      service,
      buildListParams: buildList,
      buildDetailParams: buildDetail,
      queryKeys: resolvedQueryKeys,
      cacheConfig: resolvedCacheConfig,
    })
  const simpleHooks = createSimpleListDetailHooks({
    buildList,
    buildDetail,
    getListItems: (data: OrderListResponse<TOrder> | undefined) =>
      data?.orders ?? [],
    getList: service.getOrders,
    getDetail: service.getOrder,
    getListQueryOptions,
    getDetailQueryOptions,
    resolvedCacheConfig,
    resolvedQueryKeys,
    defaultPageSize,
    defaultCacheStrategy: "userData",
  })

  function useOrders(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
    }
  ): UseOrdersResult<TOrder> {
    const { items, ...result } = simpleHooks.useList(input, options)
    return {
      ...result,
      orders: items,
    }
  }

  function useSuspenseOrders(
    input: SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<OrderListResponse<TOrder>>
    }
  ): UseSuspenseOrdersResult<TOrder> {
    const { items, ...result } = simpleHooks.useSuspenseList(
      input as TListInput,
      options
    )
    return {
      ...result,
      orders: items,
    }
  }

  function useOrder(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TOrder | null> }
  ): UseOrderResult<TOrder> {
    const { item, ...result } = simpleHooks.useDetail(input, options)
    return {
      ...result,
      order: item,
    }
  }

  function useSuspenseOrder(
    input: SuspenseDetailInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TOrder | null> }
  ): UseSuspenseOrderResult<TOrder> {
    const { item, ...result } = simpleHooks.useSuspenseDetail(
      input as TDetailInput,
      options
    )
    return {
      ...result,
      order: item,
    }
  }

  return {
    getListQueryOptions,
    getDetailQueryOptions,
    useOrders,
    useSuspenseOrders,
    useOrder,
    useSuspenseOrder,
  }
}
