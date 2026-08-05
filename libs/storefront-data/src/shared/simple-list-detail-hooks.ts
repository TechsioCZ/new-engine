import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { omitUndefined } from "@techsio/std/object"

import { getPrefetchCacheOptions } from "./cache-config"
import type { CacheConfig, CacheStrategy } from "./cache-config"
import { toErrorMessage } from "./error-utils"
import type { QueryResult, SuspenseQueryResult } from "./hook-result-types"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "./hook-types"
import { resolvePagination } from "./pagination"
import { shouldSkipPrefetch } from "./prefetch"
import type { PrefetchSkipMode } from "./prefetch"
import type { QueryKey } from "./query-keys"
import { useDelayedPrefetchController } from "./use-delayed-prefetch-controller"

interface EnabledInput {
  enabled?: boolean
}

type ListInputBase = EnabledInput & {
  page?: number
  limit?: number
  offset?: number
}

type DetailInputBase = EnabledInput & {
  id?: string
}

interface SimpleQueryKeys<TListParams, TDetailParams> {
  list: (params: TListParams) => QueryKey
  detail: (params: TDetailParams) => QueryKey
}

interface SimpleReadOptions<TData> {
  queryOptions?: ReadQueryOptions<TData>
}

interface SimpleSuspenseOptions<TData> {
  queryOptions?: SuspenseQueryOptions<TData>
}

export interface SimpleListHookResult<TItem, TListResponse> {
  items: TItem[]
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  query: QueryResult<TListResponse>
}

export interface SimpleSuspenseListHookResult<TItem, TListResponse> {
  items: TItem[]
  isLoading: false
  isFetching: boolean
  isSuccess: true
  error: null
  totalCount: number
  currentPage: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  query: SuspenseQueryResult<TListResponse>
}

export interface SimpleDetailHookResult<TItem> {
  item: TItem | null
  isLoading: boolean
  isFetching: boolean
  isSuccess: boolean
  error: string | null
  query: QueryResult<TItem | null>
}

export interface SimpleSuspenseDetailHookResult<TItem> {
  item: TItem | null
  isLoading: false
  isFetching: boolean
  isSuccess: true
  error: null
  query: SuspenseQueryResult<TItem | null>
}

interface PrefetchHookOptions {
  cacheStrategy?: CacheStrategy
  defaultDelay?: number
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export interface CreateSimpleListDetailHooksConfig<
  TItem,
  TListResponse extends { count?: number },
  TListInput extends ListInputBase,
  TListParams,
  TDetailInput extends DetailInputBase,
  TDetailParams,
> {
  buildList: (input: TListInput) => TListParams
  buildDetail: (input: TDetailInput) => TDetailParams
  getListItems: (data: TListResponse | undefined) => TItem[]
  getList: (params: TListParams, signal?: AbortSignal) => Promise<TListResponse>
  getDetail: (
    params: TDetailParams,
    signal?: AbortSignal,
  ) => Promise<TItem | null>
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<TListResponse>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<TListResponse>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TItem | null>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<TItem | null>
  resolvedCacheConfig: CacheConfig
  resolvedQueryKeys: SimpleQueryKeys<TListParams, TDetailParams>
  defaultPageSize: number
  defaultCacheStrategy: CacheStrategy
}

const stripEnabled = <TInput extends EnabledInput>(input: TInput): TInput => {
  const { enabled: _inputEnabled, ...rest } = input
  return rest as TInput
}

const resolveListPagination = <TInput extends ListInputBase, TListParams>(
  input: TInput,
  listParams: TListParams,
  defaultPageSize: number,
) => {
  const limitFromParams = (listParams as { limit?: number }).limit
  const offsetFromParams = (listParams as { offset?: number }).offset

  return resolvePagination(
    omitUndefined({
      limit: limitFromParams ?? input.limit,
      offset: offsetFromParams,
      page: input.page,
    }),
    defaultPageSize,
  )
}

export function createSimpleListDetailHooks<
  TItem,
  TListResponse extends { count?: number },
  TListInput extends ListInputBase,
  TListParams,
  TDetailInput extends DetailInputBase,
  TDetailParams,
>({
  buildList,
  buildDetail,
  getListItems,
  getList,
  getDetail,
  getListQueryOptions,
  getDetailQueryOptions,
  resolvedCacheConfig,
  resolvedQueryKeys,
  defaultPageSize,
  defaultCacheStrategy,
}: CreateSimpleListDetailHooksConfig<
  TItem,
  TListResponse,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>) {
  function useList(
    input: TListInput,
    options?: SimpleReadOptions<TListResponse>,
  ): SimpleListHookResult<TItem, TListResponse> {
    const { enabled: inputEnabled } = input
    const listParams = buildList(stripEnabled(input))
    const enabled = inputEnabled ?? true
    const query = useQuery({
      ...getListQueryOptions(
        input,
        omitUndefined({ queryOptions: options?.queryOptions }),
      ),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query
    const pagination = resolveListPagination(input, listParams, defaultPageSize)
    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      currentPage: pagination.page,
      error: toErrorMessage(error),
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      isFetching,
      isLoading,
      isSuccess,
      items: getListItems(data),
      query,
      totalCount,
      totalPages,
    }
  }

  function useSuspenseList(
    input: TListInput,
    options?: SimpleSuspenseOptions<TListResponse>,
  ): SimpleSuspenseListHookResult<TItem, TListResponse> {
    const listParams = buildList(stripEnabled(input))
    const query = useSuspenseQuery({
      ...getListQueryOptions(
        input,
        omitUndefined({ queryOptions: options?.queryOptions }),
      ),
    })
    const { data, isFetching } = query
    const pagination = resolveListPagination(input, listParams, defaultPageSize)
    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      currentPage: pagination.page,
      error: null,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      isFetching,
      isLoading: false,
      isSuccess: true,
      items: getListItems(data),
      query,
      totalCount,
      totalPages,
    }
  }

  function useDetail(
    input: TDetailInput,
    options?: SimpleReadOptions<TItem | null>,
  ): SimpleDetailHookResult<TItem> {
    const enabled = input.enabled ?? Boolean(input.id)
    const query = useQuery({
      ...getDetailQueryOptions(
        input,
        omitUndefined({ queryOptions: options?.queryOptions }),
      ),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      error: toErrorMessage(error),
      isFetching,
      isLoading,
      isSuccess,
      item: data ?? null,
      query,
    }
  }

  function useSuspenseDetail(
    input: TDetailInput,
    options?: SimpleSuspenseOptions<TItem | null>,
  ): SimpleSuspenseDetailHookResult<TItem> {
    const query = useSuspenseQuery({
      ...getDetailQueryOptions(
        input,
        omitUndefined({ queryOptions: options?.queryOptions }),
      ),
    })
    const { data, isFetching } = query

    return {
      error: null,
      isFetching,
      isLoading: false,
      isSuccess: true,
      item: data ?? null,
      query,
    }
  }

  function usePrefetchList(options?: PrefetchHookOptions) {
    const queryClient = useQueryClient()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? defaultCacheStrategy
    const defaultDelay = options?.defaultDelay ?? 800
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy,
    )

    const prefetchList = async (input: TListInput) => {
      const listParams = buildList(stripEnabled(input))
      const queryKey = resolvedQueryKeys.list(listParams)

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey,
          skipIfCached,
          skipMode,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery({
        queryFn: async ({ signal }: { signal?: AbortSignal }) =>
          getList(listParams, signal),
        queryKey,
        ...prefetchCacheOptions,
      })
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const listParams = buildList(stripEnabled(input))
      const queryKey = resolvedQueryKeys.list(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(async () => prefetchList(input), id, delay)
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchList,
    }
  }

  function usePrefetchDetail(options?: PrefetchHookOptions) {
    const queryClient = useQueryClient()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? defaultCacheStrategy
    const defaultDelay = options?.defaultDelay ?? 400
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy,
    )

    const prefetchDetail = async (input: TDetailInput) => {
      if (!input.id) {
        return
      }

      const detailParams = buildDetail(stripEnabled(input))
      const queryKey = resolvedQueryKeys.detail(detailParams)

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey,
          skipIfCached,
          skipMode,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery({
        queryFn: async ({ signal }: { signal?: AbortSignal }) =>
          getDetail(detailParams, signal),
        queryKey,
        ...prefetchCacheOptions,
      })
    }

    const delayedPrefetch = (
      input: TDetailInput,
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const detailParams = buildDetail(stripEnabled(input))
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(async () => prefetchDetail(input), id, delay)
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchDetail,
    }
  }

  return {
    useDetail,
    useList,
    usePrefetchDetail,
    usePrefetchList,
    useSuspenseDetail,
    useSuspenseList,
  }
}
