import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import { resolvePagination } from "../products/pagination"
import { createOrderQueryKeys } from "./query-keys"
import type {
  OrderDetailInputBase,
  OrderListInputBase,
  OrderQueryKeys,
  OrderService,
  UseOrdersResult,
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

  function useOrders(input: TListInput): UseOrdersResult<TOrder> {
    const listInput = { ...input } as TListInput & { enabled?: boolean }
    delete listInput.enabled
    const listParams = buildList(listInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled = input.enabled ?? true

    const { data, isLoading, isFetching, isSuccess, error } = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getOrders(listParams, signal),
      enabled,
      ...resolvedCacheConfig.userData,
    })

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
    }
  }

  function useSuspenseOrders(input: SuspenseListInput<TListInput>) {
    const listParams = buildList(input as TListInput)
    const { data, isFetching } = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getOrders(listParams, signal),
      ...resolvedCacheConfig.userData,
    })

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
      isFetching,
      totalCount,
      currentPage: pagination.page,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    }
  }

  function useOrder(input: TDetailInput) {
    const detailInput = { ...input } as TDetailInput & { enabled?: boolean }
    delete detailInput.enabled
    const detailParams = buildDetail(detailInput)
    const queryKey = resolvedQueryKeys.detail(detailParams)
    const enabled = input.enabled ?? Boolean(input.id)

    return useQuery({
      queryKey,
      queryFn: () => service.getOrder(detailParams),
      enabled,
      ...resolvedCacheConfig.userData,
    })
  }

  function useSuspenseOrder(input: SuspenseDetailInput<TDetailInput>) {
    if (!input.id) {
      throw new Error("Order id is required for order queries")
    }
    const detailParams = buildDetail(input as TDetailInput)

    return useSuspenseQuery({
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: () => service.getOrder(detailParams),
      ...resolvedCacheConfig.userData,
    })
  }

  return {
    useOrders,
    useSuspenseOrders,
    useOrder,
    useSuspenseOrder,
  }
}
