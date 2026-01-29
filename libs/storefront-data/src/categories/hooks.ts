import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import { resolvePagination } from "../products/pagination"
import { createCategoryQueryKeys } from "./query-keys"
import type {
  CategoryDetailInputBase,
  CategoryListInputBase,
  CategoryQueryKeys,
  CategoryService,
  UseCategoriesResult,
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

  function useCategories(input: TListInput): UseCategoriesResult<TCategory> {
    const { enabled: inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled = inputEnabled ?? true

    const { data, isLoading, isFetching, isSuccess, error } = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getCategories(listParams, signal),
      enabled,
      ...resolvedCacheConfig.static,
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
    }
  }

  function useSuspenseCategories(input: TListInput) {
    const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const { data, isFetching } = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getCategories(listParams, signal),
      ...resolvedCacheConfig.static,
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
      categories: data?.categories ?? [],
      isFetching,
      totalCount,
      currentPage: pagination.page,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    }
  }

  function useCategory(input: TDetailInput) {
    const { enabled: inputEnabled, ...detailInput } = input as TDetailInput & {
      enabled?: boolean
    }
    const detailParams = buildDetail(detailInput as TDetailInput)
    const queryKey = resolvedQueryKeys.detail(detailParams)
    const enabled = inputEnabled ?? Boolean(input.id)

    return useQuery({
      queryKey,
      queryFn: () => service.getCategory(detailParams),
      enabled,
      ...resolvedCacheConfig.static,
    })
  }

  function useSuspenseCategory(input: TDetailInput) {
    const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
      enabled?: boolean
    }
    if (!input.id) {
      throw new Error("Category id is required for category queries")
    }
    const detailParams = buildDetail(detailInput as TDetailInput)
    return useSuspenseQuery({
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: () => service.getCategory(detailParams),
      ...resolvedCacheConfig.static,
    })
  }

  function usePrefetchCategories(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
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

    const prefetchCategories = async (input: TListInput) => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const listParams = buildList(listInput as TListInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const cached = queryClient.getQueryData(queryKey)
      if (skipIfCached && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) => service.getCategories(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
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

    const prefetchCategory = async (input: TDetailInput) => {
      if (!input.id) {
        return
      }
      const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const detailParams = buildDetail(detailInput as TDetailInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const cached = queryClient.getQueryData(queryKey)
      if (skipIfCached && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => service.getCategory(detailParams),
        ...resolvedCacheConfig[cacheStrategy],
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
