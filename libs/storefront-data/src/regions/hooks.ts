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
import { createRegionQueryKeys } from "./query-keys"
import type {
  RegionDetailInputBase,
  RegionListInputBase,
  RegionListResponse,
  RegionQueryKeys,
  RegionService,
  UseRegionResult,
  UseRegionsResult,
  UseSuspenseRegionResult,
  UseSuspenseRegionsResult,
} from "./types"

type CacheStrategy = keyof CacheConfig

export type CreateRegionHooksConfig<
  TRegion,
  TListInput extends RegionListInputBase,
  TListParams,
  TDetailInput extends RegionDetailInputBase,
  TDetailParams,
> = {
  service: RegionService<TRegion, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: RegionQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export function createRegionHooks<
  TRegion,
  TListInput extends RegionListInputBase,
  TListParams,
  TDetailInput extends RegionDetailInputBase,
  TDetailParams,
>({
  service,
  buildListParams,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
}: CreateRegionHooksConfig<
  TRegion,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createRegionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  function useRegions(
    input: TListInput,
    options?: { queryOptions?: ReadQueryOptions<RegionListResponse<TRegion>> }
  ): UseRegionsResult<TRegion> {
    const { enabled: inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled = inputEnabled ?? true

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getRegions(listParams, signal),
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
      regions: data?.regions ?? [],
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

  function useSuspenseRegions(
    input: TListInput,
    options?: { queryOptions?: SuspenseQueryOptions<RegionListResponse<TRegion>> }
  ): UseSuspenseRegionsResult<TRegion> {
    const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const listParams = buildList(listInput as TListInput)
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getRegions(listParams, signal),
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
      regions: data?.regions ?? [],
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

  function useRegion(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TRegion | null> }
  ): UseRegionResult<TRegion> {
    const { enabled: inputEnabled, ...detailInput } = input as TDetailInput & {
      enabled?: boolean
    }
    const detailParams = buildDetail(detailInput as TDetailInput)
    const queryKey = resolvedQueryKeys.detail(detailParams)
    const enabled = inputEnabled ?? Boolean(input.id)

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getRegion(detailParams, signal),
      enabled,
      ...resolvedCacheConfig.static,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      region: data ?? null,
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      query,
    }
  }

  function useSuspenseRegion(
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TRegion | null> }
  ): UseSuspenseRegionResult<TRegion> {
    const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
      enabled?: boolean
    }
    if (!input.id) {
      throw new Error("Region id is required for region queries")
    }
    const detailParams = buildDetail(detailInput as TDetailInput)
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: ({ signal }) => service.getRegion(detailParams, signal),
      ...resolvedCacheConfig.static,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query

    return {
      region: data ?? null,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function usePrefetchRegions(options?: {
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

    const prefetchRegions = async (input: TListInput) => {
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
        queryFn: ({ signal }) => service.getRegions(listParams, signal),
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
        prefetchRegions(input)
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
      prefetchRegions,
      delayedPrefetch,
      cancelPrefetch,
    }
  }

  function usePrefetchRegion(options?: {
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

    const prefetchRegion = async (input: TDetailInput) => {
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
        queryFn: ({ signal }) => service.getRegion(detailParams, signal),
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
        prefetchRegion(input)
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
      prefetchRegion,
      delayedPrefetch,
      cancelPrefetch,
    }
  }

  return {
    useRegions,
    useSuspenseRegions,
    useRegion,
    useSuspenseRegion,
    usePrefetchRegions,
    usePrefetchRegion,
  }
}
