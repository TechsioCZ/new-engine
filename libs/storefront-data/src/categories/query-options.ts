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

export type CreateCategoryQueryOptionsFactoryConfig<
  TCategory,
  TListInput extends CategoryListInputBase,
  TListParams,
  TDetailInput extends CategoryDetailInputBase,
  TDetailParams,
> = {
  service: CategoryService<TCategory, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: CategoryQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export type CategoryQueryOptionsFactory<
  TCategory,
  TListInput extends CategoryListInputBase,
  TDetailInput extends CategoryDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CategoryListResponse<TCategory>>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<CategoryListResponse<TCategory>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TCategory | null>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TCategory | null>
}

export function createCategoryQueryOptionsFactory<
  TCategory,
  TListInput extends CategoryListInputBase,
  TListParams,
  TDetailInput extends CategoryDetailInputBase,
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
>): CategoryQueryOptionsFactory<TCategory, TListInput, TDetailInput> {
  const resolvedQueryKeys =
    queryKeys ??
    createCategoryQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)

  return createSimpleListDetailQueryOptionsFactory({
    getList: service.getCategories,
    getDetail: service.getCategory,
    buildListParams,
    buildDetailParams,
    queryKeys: resolvedQueryKeys,
    cacheConfig,
    defaultCacheStrategy: "static",
    missingDetailErrorMessage: "Category id is required for category queries",
  })
}
