import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { ReadQueryOptions, SuspenseQueryOptions } from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { resolvePagination } from "../products/pagination"
import { createOrderQueryKeys } from "./query-keys"
import type {
  OrderDetailInputBase,
  OrderListInputBase,
  OrderListResponse,
  OrderQueryKeys,
  OrderService,
  UseOrderResult,
  UseOrdersResult,
  UseSuspenseOrdersResult,
  UseSuspenseOrderResult,
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
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createOrderQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  function useOrders(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<OrderListResponse<TOrder>>
    }
  ): UseOrdersResult<TOrder> {
    const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled = input.enabled ?? true

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getOrders(listParams, signal),
      enabled,
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const limitFromParams = (listParams as { limit?: number }).limit
    const offsetFromParams = (listParams as { offset?: number }).offset
    const pagination = resolvePagination(
      {
        page: input.page,
        limit: limitFromParams ?? input.limit,
        offset: offsetFromParams,
      },
      defaultPageSize
    )

    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      orders: data?.orders ?? [],
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      totalCount,
      currentPage: pagination.page,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      query,
    }
  }

  function useSuspenseOrders(
    input: SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<OrderListResponse<TOrder>>
    }
  ): UseSuspenseOrdersResult<TOrder> {
    const listParams = buildList(input as TListInput)
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getOrders(listParams, signal),
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query

    const limitFromParams = (listParams as { limit?: number }).limit
    const offsetFromParams = (listParams as { offset?: number }).offset
    const pagination = resolvePagination(
      {
        page: input.page,
        limit: limitFromParams ?? input.limit,
        offset: offsetFromParams,
      },
      defaultPageSize
    )

    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      orders: data?.orders ?? [],
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      totalCount,
      currentPage: pagination.page,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      query,
    }
  }

  function useOrder(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TOrder | null> }
  ): UseOrderResult<TOrder> {
    const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
      enabled?: boolean
    }
    const detailParams = buildDetail(detailInput as TDetailInput)
    const queryKey = resolvedQueryKeys.detail(detailParams)
    const enabled = input.enabled ?? Boolean(input.id)

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getOrder(detailParams, signal),
      enabled,
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      order: data ?? null,
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      query,
    }
  }

  function useSuspenseOrder(
    input: SuspenseDetailInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TOrder | null> }
  ): UseSuspenseOrderResult<TOrder> {
    if (!input.id) {
      throw new Error("Order id is required for order queries")
    }
    const detailParams = buildDetail(input as TDetailInput)

    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: ({ signal }) => service.getOrder(detailParams, signal),
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query

    return {
      order: data ?? null,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  return {
    useOrders,
    useSuspenseOrders,
    useOrder,
    useSuspenseOrder,
  }
}
