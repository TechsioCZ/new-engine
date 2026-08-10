import { omitUndefined } from "@techsio/std/object"

import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
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

export interface CreateCollectionQueryOptionsFactoryConfig<
  TCollection,
  TListInput extends CollectionListInputBase & TListParams,
  TListParams,
  TDetailInput extends CollectionDetailInputBase & TDetailParams,
  TDetailParams,
> {
  service: CollectionService<TCollection, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: CollectionQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export interface CollectionQueryOptionsFactory<
  TCollection,
  TListInput extends CollectionListInputBase,
  TDetailInput extends CollectionDetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CollectionListResponse<TCollection>>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<CollectionListResponse<TCollection>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TCollection | null>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<TCollection | null>
}

export const createCollectionQueryOptionsFactory = <
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
}: CreateCollectionQueryOptionsFactoryConfig<
  TCollection,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): CollectionQueryOptionsFactory<TCollection, TListInput, TDetailInput> => {
  const buildList = buildListParams ?? ((input: TListInput) => input)
  const buildDetail = buildDetailParams ?? ((input: TDetailInput) => input)
  const resolvedQueryKeys =
    queryKeys ??
    createCollectionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)

  return createSimpleListDetailQueryOptionsFactory(
    omitUndefined({
      buildDetailParams: buildDetail,
      buildListParams: buildList,
      cacheConfig,
      defaultCacheStrategy: "static" as const,
      getDetail: service.getCollection,
      getList: service.getCollections,
      missingDetailErrorMessage:
        "Collection id is required for collection queries",
      queryKeys: resolvedQueryKeys,
    }),
  )
}
