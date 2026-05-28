import { type UseQueryResult, useQuery } from "@tanstack/react-query"
import { createCacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type { ReadQueryOptions } from "../shared/hook-types"
import { createActionRequiredQueryKeys } from "./query-keys"
import { createActionRequiredQueryOptionsFactory } from "./query-options"
import type {
  ActionRequiredHooksConfig,
  ActionRequiredListInput,
  ActionRequiredOrdersResponse,
  ActionRequiredSummary,
  ActionRequiredSummaryInput,
  PendingB2BCustomersResponse,
} from "./types"

type ActionRequiredReadOptions<TData> = {
  queryOptions?: ReadQueryOptions<TData>
}

export type ActionRequiredOrdersHookResult = {
  error: string | null
  isFetching: boolean
  isLoading: boolean
  orders: ActionRequiredOrdersResponse | undefined
  query: UseQueryResult<ActionRequiredOrdersResponse>
}

export type PendingB2BCustomersHookResult = {
  customers: PendingB2BCustomersResponse | undefined
  error: string | null
  isFetching: boolean
  isLoading: boolean
  query: UseQueryResult<PendingB2BCustomersResponse>
}

export type ActionRequiredSummaryHookResult = {
  error: string | null
  isFetching: boolean
  isLoading: boolean
  query: UseQueryResult<ActionRequiredSummary>
  summary: ActionRequiredSummary | undefined
}

export type ActionRequiredHooks = {
  getCustomersQueryOptions: ReturnType<
    typeof createActionRequiredQueryOptionsFactory
  >["getCustomersQueryOptions"]
  getOrdersQueryOptions: ReturnType<
    typeof createActionRequiredQueryOptionsFactory
  >["getOrdersQueryOptions"]
  getSummaryQueryOptions: ReturnType<
    typeof createActionRequiredQueryOptionsFactory
  >["getSummaryQueryOptions"]
  queryKeys: ReturnType<typeof createActionRequiredQueryKeys>
  useActionRequiredOrders: (
    input?: ActionRequiredListInput,
    options?: ActionRequiredReadOptions<ActionRequiredOrdersResponse>
  ) => ActionRequiredOrdersHookResult
  useActionRequiredSummary: (
    input?: ActionRequiredSummaryInput,
    options?: ActionRequiredReadOptions<ActionRequiredSummary>
  ) => ActionRequiredSummaryHookResult
  usePendingB2BCustomers: (
    input?: ActionRequiredListInput,
    options?: ActionRequiredReadOptions<PendingB2BCustomersResponse>
  ) => PendingB2BCustomersHookResult
}

export function createActionRequiredHooks({
  cacheConfig,
  queryKeyNamespace = "admin-data",
  queryKeys,
  service,
}: ActionRequiredHooksConfig): ActionRequiredHooks {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createActionRequiredQueryKeys(queryKeyNamespace)
  const queryOptions = createActionRequiredQueryOptionsFactory({
    cacheConfig: resolvedCacheConfig,
    queryKeys: resolvedQueryKeys,
    service,
  })

  function useActionRequiredOrders(
    input: ActionRequiredListInput = {},
    options?: ActionRequiredReadOptions<ActionRequiredOrdersResponse>
  ): ActionRequiredOrdersHookResult {
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

  function usePendingB2BCustomers(
    input: ActionRequiredListInput = {},
    options?: ActionRequiredReadOptions<PendingB2BCustomersResponse>
  ): PendingB2BCustomersHookResult {
    const query = useQuery({
      ...queryOptions.getCustomersQueryOptions(input, options),
      enabled: input.enabled ?? true,
    })

    return {
      customers: query.data,
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      query,
    }
  }

  function useActionRequiredSummary(
    input: ActionRequiredSummaryInput = {},
    options?: ActionRequiredReadOptions<ActionRequiredSummary>
  ): ActionRequiredSummaryHookResult {
    const query = useQuery({
      ...queryOptions.getSummaryQueryOptions(input, options),
      enabled: input.enabled ?? true,
    })

    return {
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      query,
      summary: query.data,
    }
  }

  return {
    ...queryOptions,
    queryKeys: resolvedQueryKeys,
    useActionRequiredOrders,
    useActionRequiredSummary,
    usePendingB2BCustomers,
  }
}
