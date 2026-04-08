import {
  type CacheConfig,
  type CacheStrategy,
} from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailQueryOptionsFactory } from "../shared/simple-list-detail-query-options"
import { createCollectionQueryKeys } from "./query-keys"
import type {
  CollectionDetailInputBase,
  CollectionListInputBase,
  CollectionListResponse,
  CollectionQueryKeys,
  CollectionService,
} from "./types"

export type CreateCollectionQueryOptionsFactoryConfig<
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
}

export type CollectionQueryOptionsFactory<
  TCollection,
  TListInput extends CollectionListInputBase,
  TDetailInput extends CollectionDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CollectionListResponse<TCollection>>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<CollectionListResponse<TCollection>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TCollection | null>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TCollection | null>
}

export function createCollectionQueryOptionsFactory<
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
}: CreateCollectionQueryOptionsFactoryConfig<
  TCollection,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): CollectionQueryOptionsFactory<TCollection, TListInput, TDetailInput> {
  const resolvedQueryKeys =
    queryKeys ??
    createCollectionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)

  return createSimpleListDetailQueryOptionsFactory({
    getList: service.getCollections,
    getDetail: service.getCollection,
    buildListParams,
    buildDetailParams,
    queryKeys: resolvedQueryKeys,
    cacheConfig,
    defaultCacheStrategy: "static",
    missingDetailErrorMessage:
      "Collection id is required for collection queries",
  })
}
