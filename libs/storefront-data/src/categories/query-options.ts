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
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createCategoryQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  return {
    getListQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<CategoryListResponse<TCategory>> => {
      const { enabled: _inputEnabled, ...listInput } = input as TListInput & {
        enabled?: boolean
      }
      const listParams = buildList(listInput as TListInput)
      const cacheStrategy = options?.cacheStrategy ?? "static"

      return {
        queryKey: resolvedQueryKeys.list(listParams),
        queryFn: ({ signal }) => service.getCategories(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TCategory | null> => {
      const { enabled: _inputEnabled, ...detailInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const detailParams = buildDetail(detailInput as TDetailInput)
      const cacheStrategy = options?.cacheStrategy ?? "static"

      return {
        queryKey: resolvedQueryKeys.detail(detailParams),
        queryFn: ({ signal }) => {
          if (!input.id) {
            throw new Error("Category id is required for category queries")
          }

          return service.getCategory(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
