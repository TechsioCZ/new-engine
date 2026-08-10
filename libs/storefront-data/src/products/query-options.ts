import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
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

interface ProductQueryOptionsFactoryConfigBase<
  TProduct,
  TListParams,
  TDetailParams,
> {
  service: ProductService<TProduct, TListParams, TDetailParams>
  queryKeys?: ProductQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

type ListParamsBuilder<TListInput, TListParams> = (
  input: TListInput,
) => TListParams

type DetailParamsBuilder<TDetailInput, TDetailParams> = (
  input: TDetailInput,
) => TDetailParams

export type CreateProductQueryOptionsFactoryConfig<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
> =
  | (ProductQueryOptionsFactoryConfigBase<
      TProduct,
      TListParams,
      TDetailParams
    > & {
      buildListParams: ListParamsBuilder<TListInput, TListParams>
      buildDetailParams: DetailParamsBuilder<TDetailInput, TDetailParams>
    })
  | (ProductQueryOptionsFactoryConfigBase<
      TProduct,
      TListInput,
      TDetailParams
    > & {
      buildListParams?: undefined
      buildDetailParams: DetailParamsBuilder<TDetailInput, TDetailParams>
    })
  | (ProductQueryOptionsFactoryConfigBase<
      TProduct,
      TListParams,
      TDetailInput
    > & {
      buildListParams: ListParamsBuilder<TListInput, TListParams>
      buildDetailParams?: undefined
    })
  | (ProductQueryOptionsFactoryConfigBase<
      TProduct,
      TListInput,
      TDetailInput
    > & {
      buildListParams?: undefined
      buildDetailParams?: undefined
    })

type RequiredProductQueryOptionsFactoryConfig<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
> = ProductQueryOptionsFactoryConfigBase<
  TProduct,
  TListParams,
  TDetailParams
> & {
  buildListParams: ListParamsBuilder<TListInput, TListParams>
  buildDetailParams: DetailParamsBuilder<TDetailInput, TDetailParams>
}

export interface ProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TDetailInput extends ProductDetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<ProductListResponse<TProduct>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProduct | null>
      region?: RegionInfo | null
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<TProduct | null>
}

const createProductQueryOptionsFactoryCore = <
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
}: RequiredProductQueryOptionsFactoryConfig<
  TProduct,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): ProductQueryOptionsFactory<TProduct, TListInput, TDetailInput> => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList = buildListParams
  const buildDetail = buildDetailParams

  return {
    getDetailQueryOptions: (
      input,
      options,
    ): QueryFactoryOptions<TProduct | null> => {
      const { queryKey, queryFn } = createProductDetailQueryDefinition({
        buildDetailParams: buildDetail,
        input,
        queryKeys: resolvedQueryKeys,
        service,
        ...(options?.region === undefined ? {} : { region: options.region }),
      })
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryFn,
        queryKey,
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
    getListQueryOptions: (
      input,
      options,
    ): QueryFactoryOptions<ProductListResponse<TProduct>> => {
      const { queryKey, queryFn } = createProductListQueryDefinition({
        buildListParams: buildList,
        input,
        queryKeys: resolvedQueryKeys,
        service,
        ...(options?.region === undefined ? {} : { region: options.region }),
        ...(options?.useGlobalFetcher === undefined
          ? {}
          : { useGlobalFetcher: options.useGlobalFetcher }),
      })
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryFn,
        queryKey,
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
  }
}

export function createProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
>(
  config: RequiredProductQueryOptionsFactoryConfig<
    TProduct,
    TListInput,
    TListParams,
    TDetailInput,
    TDetailParams
  >,
): ProductQueryOptionsFactory<TProduct, TListInput, TDetailInput>
export function createProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TDetailInput extends ProductDetailInputBase,
>(
  config: ProductQueryOptionsFactoryConfigBase<
    TProduct,
    TListInput,
    TDetailInput
  > & {
    buildListParams?: ListParamsBuilder<TListInput, TListInput>
    buildDetailParams?: DetailParamsBuilder<TDetailInput, TDetailInput>
  },
): ProductQueryOptionsFactory<TProduct, TListInput, TDetailInput>
export function createProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
>(
  config: ProductQueryOptionsFactoryConfigBase<
    TProduct,
    TListParams,
    TDetailInput
  > & {
    buildListParams: ListParamsBuilder<TListInput, TListParams>
    buildDetailParams?: undefined
  },
): ProductQueryOptionsFactory<TProduct, TListInput, TDetailInput>
export function createProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
>(
  config: ProductQueryOptionsFactoryConfigBase<
    TProduct,
    TListInput,
    TDetailParams
  > & {
    buildListParams?: undefined
    buildDetailParams: DetailParamsBuilder<TDetailInput, TDetailParams>
  },
): ProductQueryOptionsFactory<TProduct, TListInput, TDetailInput>
export function createProductQueryOptionsFactory<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
>(
  config: CreateProductQueryOptionsFactoryConfig<
    TProduct,
    TListInput,
    TListParams,
    TDetailInput,
    TDetailParams
  >,
): ProductQueryOptionsFactory<TProduct, TListInput, TDetailInput> {
  if (config.buildListParams === undefined) {
    if (config.buildDetailParams === undefined) {
      return createProductQueryOptionsFactoryCore({
        ...config,
        buildDetailParams: (input: TDetailInput) => input,
        buildListParams: (input: TListInput) => input,
      })
    }

    return createProductQueryOptionsFactoryCore({
      ...config,
      buildListParams: (input: TListInput) => input,
    })
  }

  if (config.buildDetailParams === undefined) {
    return createProductQueryOptionsFactoryCore({
      ...config,
      buildDetailParams: (input: TDetailInput) => input,
    })
  }

  return createProductQueryOptionsFactoryCore(config)
}
