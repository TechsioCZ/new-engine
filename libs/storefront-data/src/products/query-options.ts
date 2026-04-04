import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import { appendQueryKey, type QueryNamespace } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
import { createProductQueryKeys } from "./query-keys"
import type {
  ProductDetailInputBase,
  ProductListInputBase,
  ProductListResponse,
  ProductQueryKeys,
  ProductService,
  RegionInfo,
} from "./types"

type ProductQueryInput = RegionInfo & {
  enabled?: boolean
}

const resolveProductQueryInput = <TInput extends ProductQueryInput>(
  input: TInput,
  region?: RegionInfo | null
): TInput => {
  const { enabled: _inputEnabled, ...baseInput } = input
  return applyRegion(baseInput as TInput, region ?? undefined)
}

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

  const resolveUseGlobalFetcher = (useGlobalFetcher?: boolean): boolean =>
    Boolean(useGlobalFetcher && service.getProductsGlobal)

  const createListQueryKey = (
    listParams: TListParams,
    useGlobalFetcher: boolean
  ) =>
    useGlobalFetcher
      ? appendQueryKey(resolvedQueryKeys.list(listParams), {
          fetcher: "global",
        })
      : resolvedQueryKeys.list(listParams)

  return {
    getListQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<ProductListResponse<TProduct>> => {
      const resolvedInput = resolveProductQueryInput(input, options?.region)
      const listParams = buildList(resolvedInput)
      const useGlobalFetcher = resolveUseGlobalFetcher(
        options?.useGlobalFetcher
      )
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryKey: createListQueryKey(listParams, useGlobalFetcher),
        queryFn: ({ signal }) =>
          useGlobalFetcher
            ? (service.getProductsGlobal?.(listParams, signal) ??
              service.getProducts(listParams, signal))
            : service.getProducts(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TProduct | null> => {
      const resolvedInput = resolveProductQueryInput(input, options?.region)
      const detailParams = buildDetail(resolvedInput)
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryKey: resolvedQueryKeys.detail(detailParams),
        queryFn: ({ signal }) => {
          if (!resolvedInput.handle) {
            throw new Error("Product handle is required for product queries")
          }

          return service.getProductByHandle(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
