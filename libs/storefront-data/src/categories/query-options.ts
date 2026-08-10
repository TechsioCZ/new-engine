import { omitUndefined } from "@techsio/std/object"

import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailQueryOptionsFactory } from "../shared/simple-list-detail-query-options"
import { createCategoryQueryKeys } from "./query-keys"
import type {
  CategoryDetailInputBase,
  CategoryListInputBase,
  CategoryListResponse,
  CategoryQueryKeys,
  CategoryService,
} from "./types"

export interface CreateCategoryQueryOptionsFactoryConfig<
  TCategory,
  TListInput extends CategoryListInputBase & TListParams,
  TListParams,
  TDetailInput extends CategoryDetailInputBase & TDetailParams,
  TDetailParams,
> {
  service: CategoryService<TCategory, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: CategoryQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export interface CategoryQueryOptionsFactory<
  TCategory,
  TListInput extends CategoryListInputBase,
  TDetailInput extends CategoryDetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CategoryListResponse<TCategory>>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<CategoryListResponse<TCategory>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TCategory | null>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<TCategory | null>
}

export const createCategoryQueryOptionsFactory = <
  TCategory,
  TListInput extends CategoryListInputBase & TListParams,
  TListParams,
  TDetailInput extends CategoryDetailInputBase & TDetailParams,
  TDetailParams,
>({
  service,
  buildListParams,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateCategoryQueryOptionsFactoryConfig<
  TCategory,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): CategoryQueryOptionsFactory<TCategory, TListInput, TDetailInput> => {
  const buildList = buildListParams ?? ((input: TListInput) => input)
  const buildDetail = buildDetailParams ?? ((input: TDetailInput) => input)
  const resolvedQueryKeys =
    queryKeys ??
    createCategoryQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)

  return createSimpleListDetailQueryOptionsFactory(
    omitUndefined({
      buildDetailParams: buildDetail,
      buildListParams: buildList,
      cacheConfig,
      defaultCacheStrategy: "static" as const,
      getDetail: service.getCategory,
      getList: service.getCategories,
      missingDetailErrorMessage: "Category id is required for category queries",
      queryKeys: resolvedQueryKeys,
    }),
  )
}
