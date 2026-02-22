import type { QueryClient } from "@tanstack/react-query"
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import {
  createCacheConfig,
  getPrefetchCacheOptions,
  type CacheConfig,
} from "../shared/cache-config"
import type { ReadQueryOptions, SuspenseQueryOptions } from "../shared/hook-types"
import { shouldSkipPrefetch, type PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
import { useRegionContext } from "../shared/region-context"
import { createCatalogQueryKeys } from "./query-keys"
import { resolvePositiveInteger } from "./utils"
import type {
  CatalogListInputBase,
  CatalogListResponse,
  CatalogQueryKeys,
  CatalogService,
  RegionInfo,
  UseCatalogProductsResult,
  UseSuspenseCatalogProductsResult,
} from "./types"

type CacheStrategy = keyof CacheConfig

export type CreateCatalogHooksConfig<
  TProduct,
  TListInput extends CatalogListInputBase,
  TListParams,
  TFacets,
> = {
  service: CatalogService<TProduct, TListParams, TFacets>
  buildListParams?: (input: TListInput) => TListParams
  queryKeys?: CatalogQueryKeys<TListParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
  requireRegion?: boolean
  fallbackFacets: TFacets
}

const resolveErrorMessage = (error: unknown): string | null => {
  if (!error) {
    return null
  }

  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

export function createCatalogHooks<
  TProduct,
  TListInput extends CatalogListInputBase,
  TListParams,
  TFacets,
>({
  service,
  buildListParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 12,
  requireRegion = true,
  fallbackFacets,
}: CreateCatalogHooksConfig<TProduct, TListInput, TListParams, TFacets>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createCatalogQueryKeys<TListParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)

  function useCatalogProducts(
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      queryOptions?: ReadQueryOptions<CatalogListResponse<TProduct, TFacets>>
    }
  ): UseCatalogProductsResult<TProduct, TFacets> {
    const contextRegion = useRegionContext()
    const { enabled: inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const resolvedInput = applyRegion(listInput as TListInput, contextRegion ?? undefined)
    const listParams = buildList(resolvedInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getCatalogProducts(listParams, signal),
      enabled,
      ...resolvedCacheConfig[cacheStrategy],
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const inputPage = resolvePositiveInteger(resolvedInput.page, 1)
    const inputLimit = resolvePositiveInteger(resolvedInput.limit, defaultPageSize)
    const currentPage = resolvePositiveInteger(data?.page, inputPage)
    const responseLimit = resolvePositiveInteger(data?.limit, inputLimit)
    const totalCount = data?.count ?? 0
    const totalPages =
      data?.totalPages ??
      (responseLimit > 0 ? Math.ceil(totalCount / responseLimit) : 0)

    return {
      products: data?.products ?? [],
      facets: data?.facets ?? fallbackFacets,
      isLoading,
      isFetching,
      isSuccess,
      error: resolveErrorMessage(error),
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      query,
    }
  }

  function useSuspenseCatalogProducts(
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      queryOptions?: SuspenseQueryOptions<CatalogListResponse<TProduct, TFacets>>
    }
  ): UseSuspenseCatalogProductsResult<TProduct, TFacets> {
    const contextRegion = useRegionContext()
    const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const resolvedInput = applyRegion(listInput as TListInput, contextRegion ?? undefined)
    if (requireRegion && !resolvedInput.region_id) {
      throw new Error("Region is required for catalog queries")
    }

    const listParams = buildList(resolvedInput)
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getCatalogProducts(listParams, signal),
      ...resolvedCacheConfig[cacheStrategy],
      ...(options?.queryOptions ?? {}),
    })
    const { data, isFetching } = query

    const inputPage = resolvePositiveInteger(resolvedInput.page, 1)
    const inputLimit = resolvePositiveInteger(resolvedInput.limit, defaultPageSize)
    const currentPage = resolvePositiveInteger(data?.page, inputPage)
    const responseLimit = resolvePositiveInteger(data?.limit, inputLimit)
    const totalCount = data?.count ?? 0
    const totalPages =
      data?.totalPages ??
      (responseLimit > 0 ? Math.ceil(totalCount / responseLimit) : 0)

    return {
      products: data?.products ?? [],
      facets: data?.facets ?? fallbackFacets,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      totalCount,
      currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      query,
    }
  }

  function usePrefetchCatalogProducts(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
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

    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 250
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy
    )

    const prefetchCatalogProducts = async (input: TListInput) => {
      const { enabled: inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(
        listInput as TListInput,
        contextRegion ?? undefined
      )
      const isEnabled =
        inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))
      if (!isEnabled) {
        return
      }

      const listParams = buildList(resolvedInput)
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
        queryFn: ({ signal }) => service.getCatalogProducts(listParams, signal),
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
      const resolvedInput = applyRegion(
        listInput as TListInput,
        contextRegion ?? undefined
      )
      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      const existing = timeoutsRef.current.get(id)
      if (existing) {
        clearTimeout(existing)
      }

      const timeoutId = setTimeout(() => {
        prefetchCatalogProducts(input)
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
      prefetchCatalogProducts,
      delayedPrefetch,
      cancelPrefetch,
    }
  }

  const prefetchCatalogProducts = async (
    queryClient: QueryClient,
    input: TListInput,
    region?: RegionInfo | null
  ) => {
    const { enabled: inputEnabled, ...listInput } = input as TListInput & {
      enabled?: boolean
    }
    const resolvedInput = applyRegion(
      listInput as TListInput,
      region ?? undefined
    )
    const isEnabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))
    if (!isEnabled) {
      return
    }

    const listParams = buildList(resolvedInput)
    await queryClient.prefetchQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getCatalogProducts(listParams, signal),
      ...resolvedCacheConfig.semiStatic,
    })
  }

  return {
    useCatalogProducts,
    useSuspenseCatalogProducts,
    usePrefetchCatalogProducts,
    prefetchCatalogProducts,
  }
}
