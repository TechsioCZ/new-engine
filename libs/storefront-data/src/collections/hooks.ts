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
import { createCollectionQueryOptionsFactory } from "./query-options"
import { createCollectionQueryKeys } from "./query-keys"
import type {
  CollectionDetailInputBase,
  CollectionListInputBase,
  CollectionListResponse,
  CollectionQueryKeys,
  CollectionService,
  UseCollectionResult,
  UseCollectionsResult,
  UseSuspenseCollectionResult,
  UseSuspenseCollectionsResult,
} from "./types"

export type CreateCollectionHooksConfig<
  TCollection,
  TListInput extends CollectionListInputBase,
  TListParams,
  TDetailInput extends CollectionDetailInputBase,
  TDetailParams,
> = {
  service: CollectionService<TCollection, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: CollectionQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export function createCollectionHooks<
  TCollection,
  TListInput extends CollectionListInputBase,
  TListParams,
  TDetailInput extends CollectionDetailInputBase,
  TDetailParams,
>({
  service,
  buildListParams,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
}: CreateCollectionHooksConfig<
  TCollection,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createCollectionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)
  const { getListQueryOptions, getDetailQueryOptions } =
    createCollectionQueryOptionsFactory({
      service,
      buildListParams: buildList,
      buildDetailParams: buildDetail,
      queryKeys: resolvedQueryKeys,
      cacheConfig: resolvedCacheConfig,
    })
  const simpleHooks = createSimpleListDetailHooks({
    buildList,
    buildDetail,
    getListItems: (data: CollectionListResponse<TCollection> | undefined) =>
      data?.collections ?? [],
    getList: service.getCollections,
    getDetail: service.getCollection,
    getListQueryOptions,
    getDetailQueryOptions,
    resolvedCacheConfig,
    resolvedQueryKeys,
    defaultPageSize,
    defaultCacheStrategy: "static",
  })

  function useCollections(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CollectionListResponse<TCollection>>
    }
  ): UseCollectionsResult<TCollection> {
    const { items, ...result } = simpleHooks.useList(input, options)
    return {
      ...result,
      collections: items,
    }
  }

  function useSuspenseCollections(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<CollectionListResponse<TCollection>>
    }
  ): UseSuspenseCollectionsResult<TCollection> {
    const { items, ...result } = simpleHooks.useSuspenseList(input, options)
    return {
      ...result,
      collections: items,
    }
  }

  function useCollection(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TCollection | null> }
  ): UseCollectionResult<TCollection> {
    const { item, ...result } = simpleHooks.useDetail(input, options)
    return {
      ...result,
      collection: item,
    }
  }

  function useSuspenseCollection(
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TCollection | null> }
  ): UseSuspenseCollectionResult<TCollection> {
    const { item, ...result } = simpleHooks.useSuspenseDetail(input, options)
    return {
      ...result,
      collection: item,
    }
  }

  function usePrefetchCollections(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const { prefetchList, ...result } = simpleHooks.usePrefetchList(options)

    return {
      ...result,
      prefetchCollections: prefetchList,
    }
  }

  function usePrefetchCollection(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const { prefetchDetail, ...result } = simpleHooks.usePrefetchDetail(options)

    return {
      ...result,
      prefetchCollection: prefetchDetail,
    }
  }

  return {
    getListQueryOptions,
    getDetailQueryOptions,
    useCollections,
    useSuspenseCollections,
    useCollection,
    useSuspenseCollection,
    usePrefetchCollections,
    usePrefetchCollection,
  }
}

export type CollectionHooks<
  TCollection,
  TListInput extends CollectionListInputBase,
  TListParams,
  TDetailInput extends CollectionDetailInputBase,
  TDetailParams,
> = ReturnType<
  typeof createCollectionHooks<
    TCollection,
    TListInput,
    TListParams,
    TDetailInput,
    TDetailParams
  >
>
