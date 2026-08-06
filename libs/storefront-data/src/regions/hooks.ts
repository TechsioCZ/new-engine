import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailHooks } from "../shared/simple-list-detail-hooks"
import { createRegionQueryKeys } from "./query-keys"
import { createRegionQueryOptionsFactory } from "./query-options"
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

export interface CreateRegionHooksConfig<
  TRegion,
  TListInput extends RegionListInputBase & TListParams,
  TListParams,
  TDetailInput extends RegionDetailInputBase & TDetailParams,
  TDetailParams,
> {
  service: RegionService<TRegion, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: RegionQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export const createRegionHooks = <
  TRegion,
  TListInput extends RegionListInputBase & TListParams,
  TListParams,
  TDetailInput extends RegionDetailInputBase & TDetailParams,
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
>) => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createRegionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput): TListParams => input)
  const buildDetail =
    buildDetailParams ?? ((input: TDetailInput): TDetailParams => input)
  const { getListQueryOptions, getDetailQueryOptions } =
    createRegionQueryOptionsFactory({
      buildDetailParams: buildDetail,
      buildListParams: buildList,
      cacheConfig: resolvedCacheConfig,
      queryKeys: resolvedQueryKeys,
      service,
    })
  const simpleHooks = createSimpleListDetailHooks({
    buildDetail,
    buildList,
    defaultCacheStrategy: "static",
    defaultPageSize,
    getDetail: service.getRegion,
    getDetailQueryOptions,
    getList: service.getRegions,
    getListItems: (data: RegionListResponse<TRegion> | undefined) =>
      data?.regions ?? [],
    getListQueryOptions,
    resolvedCacheConfig,
    resolvedQueryKeys,
  })

  const useRegions = (
    input: TListInput,
    options?: { queryOptions?: ReadQueryOptions<RegionListResponse<TRegion>> },
  ): UseRegionsResult<TRegion> => {
    const { items, ...result } = simpleHooks.useList(input, options)
    return {
      ...result,
      regions: items,
    }
  }

  const useSuspenseRegions = (
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<RegionListResponse<TRegion>>
    },
  ): UseSuspenseRegionsResult<TRegion> => {
    const { items, ...result } = simpleHooks.useSuspenseList(input, options)
    return {
      ...result,
      regions: items,
    }
  }

  const useRegion = (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TRegion | null> },
  ): UseRegionResult<TRegion> => {
    const { item, ...result } = simpleHooks.useDetail(input, options)
    return {
      ...result,
      region: item,
    }
  }

  const useSuspenseRegion = (
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TRegion | null> },
  ): UseSuspenseRegionResult<TRegion> => {
    const { item, ...result } = simpleHooks.useSuspenseDetail(input, options)
    return {
      ...result,
      region: item,
    }
  }

  const usePrefetchRegions = (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const { prefetchList, ...result } = simpleHooks.usePrefetchList(options)

    return {
      ...result,
      prefetchRegions: prefetchList,
    }
  }

  const usePrefetchRegion = (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const { prefetchDetail, ...result } = simpleHooks.usePrefetchDetail(options)

    return {
      ...result,
      prefetchRegion: prefetchDetail,
    }
  }

  return {
    getDetailQueryOptions,
    getListQueryOptions,
    usePrefetchRegion,
    usePrefetchRegions,
    useRegion,
    useRegions,
    useSuspenseRegion,
    useSuspenseRegions,
  }
}

export type RegionHooks<
  TRegion,
  TListInput extends RegionListInputBase & TListParams,
  TListParams,
  TDetailInput extends RegionDetailInputBase & TDetailParams,
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
