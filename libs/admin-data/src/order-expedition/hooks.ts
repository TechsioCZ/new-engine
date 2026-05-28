import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { createCacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  ReadQueryOptions,
  WriteMutationOptions,
} from "../shared/hook-types"
import { invalidateOrderExpeditionOrderState } from "./invalidation"
import {
  createOrderExpeditionMutationOptionsFactory,
  type OrderExpeditionMutationOptionsFactory,
} from "./mutations"
import { createOrderExpeditionQueryKeys } from "./query-keys"
import {
  createOrderExpeditionQueryOptionsFactory,
  normalizeOrderIds,
} from "./query-options"
import type {
  BulkOrderBusinessStatusUpdateInput,
  BulkOrderBusinessStatusUpdateResponse,
  OrderBusinessStatusesByIdsInput,
  OrderBusinessStatusesByIdsResponse,
  OrderBusinessStatusUpdateInput,
  OrderBusinessStatusUpdateResponse,
  OrderExpeditionCarriersResponse,
  OrderExpeditionHooksConfig,
  OrderExpeditionOrdersInput,
  OrderExpeditionOrdersResponse,
  OrderExpeditionPdfInput,
  OrderExpeditionStatusUpdateInput,
  OrderExpeditionStatusUpdateResult,
} from "./types"

type OrderExpeditionReadOptions<TData> = {
  queryOptions?: ReadQueryOptions<TData>
}

type OrderExpeditionMutationOptions<TData, TVariables> = {
  mutationOptions?: WriteMutationOptions<TData, TVariables>
}

export type OrderExpeditionCarriersHookResult = {
  carriers: OrderExpeditionCarriersResponse | undefined
  error: string | null
  isFetching: boolean
  isLoading: boolean
  query: UseQueryResult<OrderExpeditionCarriersResponse>
}

export type OrderExpeditionOrdersHookResult = {
  error: string | null
  isFetching: boolean
  isLoading: boolean
  orders: OrderExpeditionOrdersResponse | undefined
  query: UseQueryResult<OrderExpeditionOrdersResponse>
}

export type OrderBusinessStatusesByIdsHookResult = {
  error: string | null
  isFetching: boolean
  isLoading: boolean
  query: UseQueryResult<OrderBusinessStatusesByIdsResponse>
  statuses: OrderBusinessStatusesByIdsResponse | undefined
}

export type OrderExpeditionHooks = {
  getBusinessStatusesByIdsQueryOptions: ReturnType<
    typeof createOrderExpeditionQueryOptionsFactory
  >["getBusinessStatusesByIdsQueryOptions"]
  getCarriersQueryOptions: ReturnType<
    typeof createOrderExpeditionQueryOptionsFactory
  >["getCarriersQueryOptions"]
  getOrdersQueryOptions: ReturnType<
    typeof createOrderExpeditionQueryOptionsFactory
  >["getOrdersQueryOptions"]
  mutations: OrderExpeditionMutationOptionsFactory
  queryKeys: ReturnType<typeof createOrderExpeditionQueryKeys>
  useBulkUpdateOrderBusinessStatus: (
    options?: OrderExpeditionMutationOptions<
      BulkOrderBusinessStatusUpdateResponse,
      BulkOrderBusinessStatusUpdateInput
    >
  ) => UseMutationResult<
    BulkOrderBusinessStatusUpdateResponse,
    Error,
    BulkOrderBusinessStatusUpdateInput
  >
  useCreateOrderExpeditionPdf: (
    options?: OrderExpeditionMutationOptions<Blob, OrderExpeditionPdfInput>
  ) => UseMutationResult<Blob, Error, OrderExpeditionPdfInput>
  useOrderBusinessStatusesByIds: (
    input: OrderBusinessStatusesByIdsInput,
    options?: OrderExpeditionReadOptions<OrderBusinessStatusesByIdsResponse>
  ) => OrderBusinessStatusesByIdsHookResult
  useOrderExpeditionCarriers: (
    options?: OrderExpeditionReadOptions<OrderExpeditionCarriersResponse>
  ) => OrderExpeditionCarriersHookResult
  useOrderExpeditionOrders: (
    input?: OrderExpeditionOrdersInput,
    options?: OrderExpeditionReadOptions<OrderExpeditionOrdersResponse>
  ) => OrderExpeditionOrdersHookResult
  useUpdateOrderBusinessStatus: (
    options?: OrderExpeditionMutationOptions<
      OrderBusinessStatusUpdateResponse,
      OrderBusinessStatusUpdateInput
    >
  ) => UseMutationResult<
    OrderBusinessStatusUpdateResponse,
    Error,
    OrderBusinessStatusUpdateInput
  >
  useUpdateOrderExpeditionStatus: (
    options?: OrderExpeditionMutationOptions<
      OrderExpeditionStatusUpdateResult,
      OrderExpeditionStatusUpdateInput
    >
  ) => UseMutationResult<
    OrderExpeditionStatusUpdateResult,
    Error,
    OrderExpeditionStatusUpdateInput
  >
}

export function createOrderExpeditionHooks({
  cacheConfig,
  queryKeyNamespace = "admin-data",
  queryKeys,
  service,
}: OrderExpeditionHooksConfig): OrderExpeditionHooks {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createOrderExpeditionQueryKeys(queryKeyNamespace)
  const queryOptions = createOrderExpeditionQueryOptionsFactory({
    cacheConfig: resolvedCacheConfig,
    queryKeys: resolvedQueryKeys,
    service,
  })
  const mutations = createOrderExpeditionMutationOptionsFactory({ service })

  function useOrderExpeditionCarriers(
    options?: OrderExpeditionReadOptions<OrderExpeditionCarriersResponse>
  ): OrderExpeditionCarriersHookResult {
    const query = useQuery(queryOptions.getCarriersQueryOptions(options))

    return {
      carriers: query.data,
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      query,
    }
  }

  function useOrderExpeditionOrders(
    input: OrderExpeditionOrdersInput = {},
    options?: OrderExpeditionReadOptions<OrderExpeditionOrdersResponse>
  ): OrderExpeditionOrdersHookResult {
    const query = useQuery({
      ...queryOptions.getOrdersQueryOptions(input, options),
      enabled: input.enabled ?? true,
    })

    return {
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      orders: query.data,
      query,
    }
  }

  function useOrderBusinessStatusesByIds(
    input: OrderBusinessStatusesByIdsInput,
    options?: OrderExpeditionReadOptions<OrderBusinessStatusesByIdsResponse>
  ): OrderBusinessStatusesByIdsHookResult {
    const ids = normalizeOrderIds(input.ids)
    const query = useQuery({
      ...queryOptions.getBusinessStatusesByIdsQueryOptions(
        { ...input, ids },
        options
      ),
      enabled: (input.enabled ?? true) && ids.length > 0,
    })

    return {
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      query,
      statuses: query.data,
    }
  }

  function useCreateOrderExpeditionPdf(
    options?: OrderExpeditionMutationOptions<Blob, OrderExpeditionPdfInput>
  ) {
    return useMutation(mutations.createPdfMutationOptions(options))
  }

  function useUpdateOrderExpeditionStatus(
    options?: OrderExpeditionMutationOptions<
      OrderExpeditionStatusUpdateResult,
      OrderExpeditionStatusUpdateInput
    >
  ) {
    const queryClient = useQueryClient()
    const mutationOptions = mutations.updateStatusMutationOptions(options)
    const userOnSuccess = mutationOptions.onSuccess

    return useMutation({
      ...mutationOptions,
      async onSuccess(
        data: OrderExpeditionStatusUpdateResult,
        variables: OrderExpeditionStatusUpdateInput,
        context: unknown
      ) {
        if (data.ok) {
          await invalidateOrderExpeditionOrderState(
            queryClient,
            resolvedQueryKeys
          )
        }

        await userOnSuccess?.(data, variables, context)
      },
    })
  }

  function useUpdateOrderBusinessStatus(
    options?: OrderExpeditionMutationOptions<
      OrderBusinessStatusUpdateResponse,
      OrderBusinessStatusUpdateInput
    >
  ) {
    const queryClient = useQueryClient()
    const mutationOptions =
      mutations.updateBusinessStatusMutationOptions(options)
    const userOnSuccess = mutationOptions.onSuccess

    return useMutation({
      ...mutationOptions,
      async onSuccess(
        data: OrderBusinessStatusUpdateResponse,
        variables: OrderBusinessStatusUpdateInput,
        context: unknown
      ) {
        await invalidateOrderExpeditionOrderState(
          queryClient,
          resolvedQueryKeys
        )
        await userOnSuccess?.(data, variables, context)
      },
    })
  }

  function useBulkUpdateOrderBusinessStatus(
    options?: OrderExpeditionMutationOptions<
      BulkOrderBusinessStatusUpdateResponse,
      BulkOrderBusinessStatusUpdateInput
    >
  ) {
    const queryClient = useQueryClient()
    const mutationOptions =
      mutations.bulkUpdateBusinessStatusMutationOptions(options)
    const userOnSuccess = mutationOptions.onSuccess

    return useMutation({
      ...mutationOptions,
      async onSuccess(
        data: BulkOrderBusinessStatusUpdateResponse,
        variables: BulkOrderBusinessStatusUpdateInput,
        context: unknown
      ) {
        await invalidateOrderExpeditionOrderState(
          queryClient,
          resolvedQueryKeys
        )
        await userOnSuccess?.(data, variables, context)
      },
    })
  }

  return {
    ...queryOptions,
    mutations,
    queryKeys: resolvedQueryKeys,
    useBulkUpdateOrderBusinessStatus,
    useCreateOrderExpeditionPdf,
    useOrderBusinessStatusesByIds,
    useOrderExpeditionCarriers,
    useOrderExpeditionOrders,
    useUpdateOrderBusinessStatus,
    useUpdateOrderExpeditionStatus,
  }
}
