import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailHooks } from "../shared/simple-list-detail-hooks"
import { createCollectionQueryKeys } from "./query-keys"
import { createCollectionQueryOptionsFactory } from "./query-options"
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

export interface CreateCollectionHooksConfig<
  TCollection,
  TListInput extends CollectionListInputBase,
  TListParams,
  TDetailInput extends CollectionDetailInputBase,
  TDetailParams,
> {
  service: CollectionService<TCollection, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: CollectionQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export const createCollectionHooks = <
  TCollection,
  TListInput extends CollectionListInputBase & TListParams,
  TListParams,
  TDetailInput extends CollectionDetailInputBase & TDetailParams,
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
>) => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createCollectionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList = buildListParams ?? ((input: TListInput) => input)
  const buildDetail = buildDetailParams ?? ((input: TDetailInput) => input)
  const { getListQueryOptions, getDetailQueryOptions } =
    createCollectionQueryOptionsFactory({
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
    getDetail: service.getCollection,
    getDetailQueryOptions,
    getList: service.getCollections,
    getListItems: (data: CollectionListResponse<TCollection> | undefined) =>
      data?.collections ?? [],
    getListQueryOptions,
    resolvedCacheConfig,
    resolvedQueryKeys,
  })

  const useCollections = (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CollectionListResponse<TCollection>>
    },
  ): UseCollectionsResult<TCollection> => {
    const { items, ...result } = simpleHooks.useList(input, options)
    return {
      ...result,
      collections: items,
    }
  }

  const useSuspenseCollections = (
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<CollectionListResponse<TCollection>>
    },
  ): UseSuspenseCollectionsResult<TCollection> => {
    const { items, ...result } = simpleHooks.useSuspenseList(input, options)
    return {
      ...result,
      collections: items,
    }
  }

  const useCollection = (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TCollection | null> },
  ): UseCollectionResult<TCollection> => {
    const { item, ...result } = simpleHooks.useDetail(input, options)
    return {
      ...result,
      collection: item,
    }
  }

  const useSuspenseCollection = (
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TCollection | null> },
  ): UseSuspenseCollectionResult<TCollection> => {
    const { item, ...result } = simpleHooks.useSuspenseDetail(input, options)
    return {
      ...result,
      collection: item,
    }
  }

  const usePrefetchCollections = (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const { prefetchList, ...result } = simpleHooks.usePrefetchList(options)

    return {
      ...result,
      prefetchCollections: prefetchList,
    }
  }

  const usePrefetchCollection = (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const { prefetchDetail, ...result } = simpleHooks.usePrefetchDetail(options)

    return {
      ...result,
      prefetchCollection: prefetchDetail,
    }
  }

  return {
    getDetailQueryOptions,
    getListQueryOptions,
    useCollection,
    useCollections,
    usePrefetchCollection,
    usePrefetchCollections,
    useSuspenseCollection,
    useSuspenseCollections,
  }
}

export type CollectionHooks<
  TCollection,
  TListInput extends CollectionListInputBase & TListParams,
  TListParams,
  TDetailInput extends CollectionDetailInputBase & TDetailParams,
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
