import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import {
  createCacheConfig,
  getPrefetchCacheOptions,
  type CacheConfig,
} from "../shared/cache-config"
import type { ReadQueryOptions, SuspenseQueryOptions } from "../shared/hook-types"
import { shouldSkipPrefetch, type PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { resolvePagination } from "../products/pagination"
import { createCategoryQueryKeys } from "./query-keys"
import type {
  CategoryDetailInputBase,
  CategoryListInputBase,
  CategoryListResponse,
  CategoryQueryKeys,
  CategoryService,
  UseCategoryResult,
  UseCategoriesResult,
  UseSuspenseCategoriesResult,
  UseSuspenseCategoryResult,
} from "./types"

type CacheStrategy = keyof CacheConfig

export type CreateCategoryHooksConfig<
  TCategory,
  TListInput extends CategoryListInputBase,
  TListParams,
  TDetailInput extends CategoryDetailInputBase,
  TDetailParams,
> = {
  service: CategoryService<TCategory, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: CategoryQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export function createCategoryHooks<
  TCategory,
  TListInput extends CategoryListInputBase,
  TListParams,
  TDetailInput extends CategoryDetailInputBase,
  TDetailParams,
>({
  service,
  buildListParams,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
}: CreateCategoryHooksConfig<
  TCategory,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createCategoryQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  function useCategories(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CategoryListResponse<TCategory>>
    }
  ): UseCategoriesResult<TCategory> {
    const { enabled: inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled = inputEnabled ?? true

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getCategories(listParams, signal),
      enabled,
      ...resolvedCacheConfig.static,
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
      categories: data?.categories ?? [],
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

  function useSuspenseCategories(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<CategoryListResponse<TCategory>>
    }
  ): UseSuspenseCategoriesResult<TCategory> {
    const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getCategories(listParams, signal),
      ...resolvedCacheConfig.static,
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
      categories: data?.categories ?? [],
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

  function useCategory(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TCategory | null> }
  ): UseCategoryResult<TCategory> {
    const { enabled: inputEnabled, ...detailInput } = input as TDetailInput & {
      enabled?: boolean
    }
    const detailParams = buildDetail(detailInput as TDetailInput)
    const queryKey = resolvedQueryKeys.detail(detailParams)
    const enabled = inputEnabled ?? Boolean(input.id)

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getCategory(detailParams, signal),
      enabled,
      ...resolvedCacheConfig.static,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      category: data ?? null,
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      query,
    }
  }

  function useSuspenseCategory(
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TCategory | null> }
  ): UseSuspenseCategoryResult<TCategory> {
    const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
      enabled?: boolean
    }
    if (!input.id) {
      throw new Error("Category id is required for category queries")
    }
    const detailParams = buildDetail(detailInput as TDetailInput)
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: ({ signal }) => service.getCategory(detailParams, signal),
      ...resolvedCacheConfig.static,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query

    return {
      category: data ?? null,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function usePrefetchCategories(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const queryClient = useQueryClient()
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
    )
    useEffect(() => {
      const timeouts = timeoutsRef.current
      return () => {
        for (const timeout of timeouts.values()) {
          clearTimeout(timeout)
        }
        timeouts.clear()
      }
    }, [])
    const cacheStrategy = options?.cacheStrategy ?? "static"
    const defaultDelay = options?.defaultDelay ?? 800
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy
    )

    const prefetchCategories = async (input: TListInput) => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const listParams = buildList(listInput as TListInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      if (
        shouldSkipPrefetch({
          queryClient,
          queryKey,
          cacheOptions: prefetchCacheOptions,
          skipIfCached,
          skipMode,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) => service.getCategories(listParams, signal),
        ...prefetchCacheOptions,
      })
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string
    ) => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const listParams = buildList(listInput as TListInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      const existing = timeoutsRef.current.get(id)
      if (existing) {
        clearTimeout(existing)
      }

      const timeoutId = setTimeout(() => {
        prefetchCategories(input)
        timeoutsRef.current.delete(id)
      }, delay)

      timeoutsRef.current.set(id, timeoutId)
      return id
    }

    const cancelPrefetch = (prefetchId: string) => {
      const timeout = timeoutsRef.current.get(prefetchId)
      if (timeout) {
        clearTimeout(timeout)
        timeoutsRef.current.delete(prefetchId)
      }
    }

    return {
      prefetchCategories,
      delayedPrefetch,
      cancelPrefetch,
    }
  }

  function usePrefetchCategory(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const queryClient = useQueryClient()
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
    )
    useEffect(() => {
      const timeouts = timeoutsRef.current
      return () => {
        for (const timeout of timeouts.values()) {
          clearTimeout(timeout)
        }
        timeouts.clear()
      }
    }, [])
    const cacheStrategy = options?.cacheStrategy ?? "static"
    const defaultDelay = options?.defaultDelay ?? 400
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy
    )

    const prefetchCategory = async (input: TDetailInput) => {
      if (!input.id) {
        return
      }
      const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const detailParams = buildDetail(detailInput as TDetailInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      if (
        shouldSkipPrefetch({
          queryClient,
          queryKey,
          cacheOptions: prefetchCacheOptions,
          skipIfCached,
          skipMode,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) => service.getCategory(detailParams, signal),
        ...prefetchCacheOptions,
      })
    }

    const delayedPrefetch = (
      input: TDetailInput,
      delay = defaultDelay,
      prefetchId?: string
    ) => {
      const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const detailParams = buildDetail(detailInput as TDetailInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      const existing = timeoutsRef.current.get(id)
      if (existing) {
        clearTimeout(existing)
      }

      const timeoutId = setTimeout(() => {
        prefetchCategory(input)
        timeoutsRef.current.delete(id)
      }, delay)

      timeoutsRef.current.set(id, timeoutId)
      return id
    }

    const cancelPrefetch = (prefetchId: string) => {
      const timeout = timeoutsRef.current.get(prefetchId)
      if (timeout) {
        clearTimeout(timeout)
        timeoutsRef.current.delete(prefetchId)
      }
    }

    return {
      prefetchCategory,
      delayedPrefetch,
      cancelPrefetch,
    }
  }

  return {
    useCategories,
    useSuspenseCategories,
    useCategory,
    useSuspenseCategory,
    usePrefetchCategories,
    usePrefetchCategory,
  }
}
