import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import {
  createProductDetailQueryDefinition,
  createProductListQueryDefinition,
} from "./query-definition"
import { createProductQueryKeys } from "./query-keys"
import type {
  ProductDetailInputBase,
  ProductListInputBase,
  ProductListResponse,
  ProductQueryKeys,
  ProductService,
  RegionInfo,
} from "./types"

type CacheStrategy = keyof CacheConfig

export type CreateProductQueryOptionsFactoryConfig<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
> = {
  service: ProductService<TProduct, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: ProductQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export type ProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TDetailInput extends ProductDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<ProductListResponse<TProduct>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProduct | null>
      region?: RegionInfo | null
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TProduct | null>
}

export function createProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
>({
  service,
  buildListParams,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateProductQueryOptionsFactoryConfig<
  TProduct,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): ProductQueryOptionsFactory<TProduct, TListInput, TDetailInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  return {
    getListQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<ProductListResponse<TProduct>> => {
      const { queryKey, queryFn } = createProductListQueryDefinition({
        input,
        region: options?.region,
        service,
        buildListParams: buildList,
        queryKeys: resolvedQueryKeys,
        useGlobalFetcher: options?.useGlobalFetcher,
      })
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryKey,
        queryFn,
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TProduct | null> => {
      const { queryKey, queryFn } = createProductDetailQueryDefinition({
        input,
        region: options?.region,
        service,
        buildDetailParams: buildDetail,
        queryKeys: resolvedQueryKeys,
      })
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryKey,
        queryFn,
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
