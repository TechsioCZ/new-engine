import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig } from "../shared/cache-config"
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

type SuspenseListInput<TInput extends OrderListInputBase> = TInput & {
  enabled?: never
}
type SuspenseDetailInput<TInput extends OrderDetailInputBase> = TInput & {
  enabled?: never
}

export interface CreateOrderHooksConfig<
  TOrder,
  TListInput extends OrderListInputBase & TListParams,
  TListParams,
  TDetailInput extends OrderDetailInputBase & TDetailParams,
  TDetailParams,
> {
  service: OrderService<TOrder, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: OrderQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export interface OrderHooks<
  TOrder,
  TListInput extends OrderListInputBase,
  TDetailInput extends OrderDetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
    },
  ) => QueryFactoryOptions<OrderListResponse<TOrder>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TOrder | null> },
  ) => QueryFactoryOptions<TOrder | null>
  useOrders: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
    },
  ) => UseOrdersResult<TOrder>
  useSuspenseOrders: (
    input: SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<OrderListResponse<TOrder>>
    },
  ) => UseSuspenseOrdersResult<TOrder>
  useOrder: (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TOrder | null> },
  ) => UseOrderResult<TOrder>
  useSuspenseOrder: (
    input: SuspenseDetailInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TOrder | null> },
  ) => UseSuspenseOrderResult<TOrder>
}

export const createOrderHooks = <
  TOrder,
  TListInput extends OrderListInputBase & TListParams,
  TListParams,
  TDetailInput extends OrderDetailInputBase & TDetailParams,
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
>): OrderHooks<TOrder, TListInput, TDetailInput> => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createOrderQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput): TListParams => input)
  const buildDetail =
    buildDetailParams ?? ((input: TDetailInput): TDetailParams => input)
  const { getListQueryOptions, getDetailQueryOptions } =
    createOrderQueryOptionsFactory({
      buildDetailParams: buildDetail,
      buildListParams: buildList,
      cacheConfig: resolvedCacheConfig,
      queryKeys: resolvedQueryKeys,
      service,
    })
  const simpleHooks = createSimpleListDetailHooks({
    buildDetail,
    buildList,
    defaultCacheStrategy: "userData",
    defaultPageSize,
    getDetail: service.getOrder,
    getDetailQueryOptions,
    getList: service.getOrders,
    getListItems: (data: OrderListResponse<TOrder> | undefined) =>
      data?.orders ?? [],
    getListQueryOptions,
    resolvedCacheConfig,
    resolvedQueryKeys,
  })

  const useOrders = (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
    },
  ): UseOrdersResult<TOrder> => {
    const { items, ...result } = simpleHooks.useList(input, options)
    return {
      ...result,
      orders: items,
    }
  }

  const useSuspenseOrders = (
    input: SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<OrderListResponse<TOrder>>
    },
  ): UseSuspenseOrdersResult<TOrder> => {
    const { items, ...result } = simpleHooks.useSuspenseList(input, options)
    return {
      ...result,
      orders: items,
    }
  }

  const useOrder = (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TOrder | null> },
  ): UseOrderResult<TOrder> => {
    const { item, ...result } = simpleHooks.useDetail(input, options)
    return {
      ...result,
      order: item,
    }
  }

  const useSuspenseOrder = (
    input: SuspenseDetailInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TOrder | null> },
  ): UseSuspenseOrderResult<TOrder> => {
    const { item, ...result } = simpleHooks.useSuspenseDetail(input, options)
    return {
      ...result,
      order: item,
    }
  }

  return {
    getDetailQueryOptions,
    getListQueryOptions,
    useOrder,
    useOrders,
    useSuspenseOrder,
    useSuspenseOrders,
  }
}
