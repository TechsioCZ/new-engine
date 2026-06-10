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
import {
  createDefaultListParams,
  stripDetailInput,
  withCustomerScope,
} from "./input-utils"
import { createProductListQueryKeys } from "./query-keys"
import type {
  ProductListCartLike,
  ProductListDetailInputBase,
  ProductListListInputBase,
  ProductListListResult,
  ProductListQueryKeys,
  ProductListService,
} from "./types"

export type CreateProductListQueryOptionsFactoryConfig<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TListParams,
  TDetailInput extends ProductListDetailInputBase,
  TDetailParams,
  TListKeyParams = TListParams & { customerId?: string | null },
  TDetailKeyParams = TDetailParams & { customerId?: string | null },
> = {
  service: ProductListService<
    TProductList,
    TProductListItem,
    TCart,
    TListParams,
    TDetailParams
  >
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  buildListKeyParams?: (
    input: TListInput,
    params: TListParams
  ) => TListKeyParams
  buildDetailKeyParams?: (
    input: TDetailInput,
    params: TDetailParams
  ) => TDetailKeyParams
  queryKeys?: ProductListQueryKeys<TListKeyParams, TDetailKeyParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export type ProductListQueryOptionsFactory<
  TProductList,
  TListInput extends ProductListListInputBase,
  TDetailInput extends ProductListDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<ProductListListResult<TProductList>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TProductList | null>
}

export function createProductListQueryOptionsFactory<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TListParams = Omit<TListInput, "enabled" | "customerId" | "page">,
  TDetailInput extends ProductListDetailInputBase = ProductListDetailInputBase,
  TDetailParams = Omit<TDetailInput, "enabled" | "customerId">,
  TListKeyParams = TListParams & { customerId?: string | null },
  TDetailKeyParams = TDetailParams & { customerId?: string | null },
>({
  service,
  buildListParams,
  buildDetailParams,
  buildListKeyParams,
  buildDetailKeyParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
}: CreateProductListQueryOptionsFactoryConfig<
  TProductList,
  TProductListItem,
  TCart,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams,
  TListKeyParams,
  TDetailKeyParams
>): ProductListQueryOptionsFactory<TProductList, TListInput, TDetailInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductListQueryKeys<TListKeyParams, TDetailKeyParams>(
      queryKeyNamespace
    )
  const buildList =
    buildListParams ??
    ((input: TListInput) =>
      createDefaultListParams(input, defaultPageSize) as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => stripDetailInput(input) as TDetailParams)
  const buildListKey =
    buildListKeyParams ??
    ((input: TListInput, params: TListParams) =>
      withCustomerScope(params, input) as TListKeyParams)
  const buildDetailKey =
    buildDetailKeyParams ??
    ((input: TDetailInput, params: TDetailParams) =>
      withCustomerScope(params, input) as TDetailKeyParams)

  return {
    getListQueryOptions: (input, options) => {
      const listParams = buildList(input)
      const cacheStrategy = options?.cacheStrategy ?? "userData"

      return {
        queryKey: resolvedQueryKeys.list(buildListKey(input, listParams)),
        queryFn: ({ signal }) => service.listProductLists(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
    getDetailQueryOptions: (input, options) => {
      const detailParams = buildDetail(input)
      const cacheStrategy = options?.cacheStrategy ?? "userData"

      return {
        queryKey: resolvedQueryKeys.detail(
          buildDetailKey(input, detailParams)
        ),
        queryFn: ({ signal }) => {
          if (!input.id) {
            throw new Error("Product list id is required")
          }

          return service.getProductList(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
