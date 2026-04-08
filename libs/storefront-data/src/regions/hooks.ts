import {
  type CacheConfig,
  type CacheStrategy,
  createCacheConfig,
} from "../shared/cache-config"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailHooks } from "../shared/simple-list-detail-hooks"
import { createRegionQueryOptionsFactory } from "./query-options"
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
  const { getListQueryOptions, getDetailQueryOptions } =
    createRegionQueryOptionsFactory({
      service,
      buildListParams: buildList,
      buildDetailParams: buildDetail,
      queryKeys: resolvedQueryKeys,
      cacheConfig: resolvedCacheConfig,
    })
  const simpleHooks = createSimpleListDetailHooks({
    buildList,
    buildDetail,
    getListItems: (data: RegionListResponse<TRegion> | undefined) =>
      data?.regions ?? [],
    getList: service.getRegions,
    getDetail: service.getRegion,
    getListQueryOptions,
    getDetailQueryOptions,
    resolvedCacheConfig,
    resolvedQueryKeys,
    defaultPageSize,
    defaultCacheStrategy: "static",
  })

  function useRegions(
    input: TListInput,
    options?: { queryOptions?: ReadQueryOptions<RegionListResponse<TRegion>> }
  ): UseRegionsResult<TRegion> {
    const { items, ...result } = simpleHooks.useList(input, options)
    return {
      ...result,
      regions: items,
    }
  }

  function useSuspenseRegions(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<RegionListResponse<TRegion>>
    }
  ): UseSuspenseRegionsResult<TRegion> {
    const { items, ...result } = simpleHooks.useSuspenseList(input, options)
    return {
      ...result,
      regions: items,
    }
  }

  function useRegion(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TRegion | null> }
  ): UseRegionResult<TRegion> {
    const { item, ...result } = simpleHooks.useDetail(input, options)
    return {
      ...result,
      region: item,
    }
  }

  function useSuspenseRegion(
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TRegion | null> }
  ): UseSuspenseRegionResult<TRegion> {
    const { item, ...result } = simpleHooks.useSuspenseDetail(input, options)
    return {
      ...result,
      region: item,
    }
  }

  function usePrefetchRegions(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const { prefetchList, ...result } = simpleHooks.usePrefetchList(options)

    return {
      ...result,
      prefetchRegions: prefetchList,
    }
  }

  function usePrefetchRegion(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const { prefetchDetail, ...result } = simpleHooks.usePrefetchDetail(options)

    return {
      ...result,
      prefetchRegion: prefetchDetail,
    }
  }

  return {
    getListQueryOptions,
    getDetailQueryOptions,
    useRegions,
    useSuspenseRegions,
    useRegion,
    useSuspenseRegion,
    usePrefetchRegions,
    usePrefetchRegion,
  }
}

export type RegionHooks<
  TRegion,
  TListInput extends RegionListInputBase,
  TListParams,
  TDetailInput extends RegionDetailInputBase,
  TDetailParams,
> = ReturnType<
  typeof createRegionHooks<
    TRegion,
    TListInput,
    TListParams,
    TDetailInput,
    TDetailParams
  >
>
