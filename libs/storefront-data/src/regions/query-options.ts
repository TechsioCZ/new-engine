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
import { createRegionQueryKeys } from "./query-keys"
import type {
  RegionDetailInputBase,
  RegionListInputBase,
  RegionListResponse,
  RegionQueryKeys,
  RegionService,
} from "./types"

export type CreateRegionQueryOptionsFactoryConfig<
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
}

export type RegionQueryOptionsFactory<
  TRegion,
  TListInput extends RegionListInputBase,
  TDetailInput extends RegionDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<RegionListResponse<TRegion>>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<RegionListResponse<TRegion>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TRegion | null>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TRegion | null>
}

export function createRegionQueryOptionsFactory<
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
}: CreateRegionQueryOptionsFactoryConfig<
  TRegion,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): RegionQueryOptionsFactory<TRegion, TListInput, TDetailInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createRegionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  return {
    getListQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<RegionListResponse<TRegion>> => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const listParams = buildList(listInput as TListInput)
      const cacheStrategy = options?.cacheStrategy ?? "static"

      return {
        queryKey: resolvedQueryKeys.list(listParams),
        queryFn: ({ signal }) => service.getRegions(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TRegion | null> => {
      const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const detailParams = buildDetail(detailInput as TDetailInput)
      const cacheStrategy = options?.cacheStrategy ?? "static"

      return {
        queryKey: resolvedQueryKeys.detail(detailParams),
        queryFn: ({ signal }) => {
          if (!input.id) {
            throw new Error("Region id is required for region queries")
          }

          return service.getRegion(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
