import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { createSimpleListDetailHooks } from "../shared/simple-list-detail-hooks"
import { createCategoryQueryKeys } from "./query-keys"
import { createCategoryQueryOptionsFactory } from "./query-options"
import type {
  CategoryDetailInputBase,
  CategoryListInputBase,
  CategoryListResponse,
  CategoryQueryKeys,
  CategoryService,
  UseCategoriesResult,
  UseCategoryResult,
  UseSuspenseCategoriesResult,
  UseSuspenseCategoryResult,
} from "./types"

export interface CreateCategoryHooksConfig<
  TCategory,
  TListInput extends CategoryListInputBase,
  TListParams,
  TDetailInput extends CategoryDetailInputBase,
  TDetailParams,
> {
  service: CategoryService<TCategory, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: CategoryQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export function createCategoryHooks<
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
  defaultPageSize = 20,
}: CreateCategoryHooksConfig<
  TCategory,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createCategoryQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ??
    ((input: TListInput) => ({ ...input }) as TListInput & TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => ({ ...input }) as TDetailInput & TDetailParams)
  const { getListQueryOptions, getDetailQueryOptions } =
    createCategoryQueryOptionsFactory({
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
    getDetail: service.getCategory,
    getDetailQueryOptions,
    getList: service.getCategories,
    getListItems: (data: CategoryListResponse<TCategory> | undefined) =>
      data?.categories ?? [],
    getListQueryOptions,
    resolvedCacheConfig,
    resolvedQueryKeys,
  })

  function useCategories(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<CategoryListResponse<TCategory>>
    }
  ): UseCategoriesResult<TCategory> {
    const { items, ...result } = simpleHooks.useList(input, options)
    return {
      ...result,
      categories: items,
    }
  }

  function useSuspenseCategories(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<CategoryListResponse<TCategory>>
    }
  ): UseSuspenseCategoriesResult<TCategory> {
    const { items, ...result } = simpleHooks.useSuspenseList(input, options)
    return {
      ...result,
      categories: items,
    }
  }

  function useCategory(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TCategory | null> }
  ): UseCategoryResult<TCategory> {
    const { item, ...result } = simpleHooks.useDetail(input, options)
    return {
      ...result,
      category: item,
    }
  }

  function useSuspenseCategory(
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TCategory | null> }
  ): UseSuspenseCategoryResult<TCategory> {
    const { item, ...result } = simpleHooks.useSuspenseDetail(input, options)
    return {
      ...result,
      category: item,
    }
  }

  function usePrefetchCategories(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const { prefetchList, ...result } = simpleHooks.usePrefetchList(options)

    return {
      ...result,
      prefetchCategories: prefetchList,
    }
  }

  function usePrefetchCategory(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const { prefetchDetail, ...result } = simpleHooks.usePrefetchDetail(options)

    return {
      ...result,
      prefetchCategory: prefetchDetail,
    }
  }

  return {
    getDetailQueryOptions,
    getListQueryOptions,
    useCategories,
    useCategory,
    usePrefetchCategories,
    usePrefetchCategory,
    useSuspenseCategories,
    useSuspenseCategory,
  }
}

export type CategoryHooks<
  TCategory,
  TListInput extends CategoryListInputBase,
  TListParams,
  TDetailInput extends CategoryDetailInputBase,
  TDetailParams,
> = ReturnType<
  typeof createCategoryHooks<
    TCategory,
    TListInput,
    TListParams,
    TDetailInput,
    TDetailParams
  >
>
