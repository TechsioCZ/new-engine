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
  const resolvedQueryKeys =
    queryKeys ??
    createRegionQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)

  return createSimpleListDetailQueryOptionsFactory({
    getList: service.getRegions,
    getDetail: service.getRegion,
    buildListParams,
    buildDetailParams,
    queryKeys: resolvedQueryKeys,
    cacheConfig,
    defaultCacheStrategy: "static",
    missingDetailErrorMessage: "Region id is required for region queries",
  })
}
