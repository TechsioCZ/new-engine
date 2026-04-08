import {
  type CacheConfig,
  type CacheStrategy,
  createCacheConfig,
} from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
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
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createCollectionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  return {
    getListQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<CollectionListResponse<TCollection>> => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const listParams = buildList(listInput as TListInput)
      const cacheStrategy = options?.cacheStrategy ?? "static"

      return {
        queryKey: resolvedQueryKeys.list(listParams),
        queryFn: ({ signal }) => service.getCollections(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TCollection | null> => {
      const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const detailParams = buildDetail(detailInput as TDetailInput)
      const cacheStrategy = options?.cacheStrategy ?? "static"

      return {
        queryKey: resolvedQueryKeys.detail(detailParams),
        queryFn: ({ signal }) => {
          if (!input.id) {
            throw new Error("Collection id is required for collection queries")
          }

          return service.getCollection(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
