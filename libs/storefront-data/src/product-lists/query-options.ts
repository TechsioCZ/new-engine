import { createCacheConfig } from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createProductListQueryKeys } from "./query-keys"
import type {
  ProductListCartLike,
  ProductListDetailInputBase,
  ProductListListInputBase,
  ProductListListResult,
  ProductListQueryKeys,
  ProductListService,
} from "./types"

export interface CreateProductListQueryOptionsFactoryConfig<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TListParams,
  TDetailInput extends ProductListDetailInputBase,
  TDetailParams,
  TListKeyParams = TListParams & { customerId?: string | null },
  TDetailKeyParams = TDetailParams & { customerId?: string | null },
> {
  service: ProductListService<
    TProductList,
    TProductListItem,
    TCart,
    TListParams,
    TDetailParams
  >
  buildListParams: (input: TListInput) => TListParams
  buildDetailParams: (input: TDetailInput) => TDetailParams
  buildListKeyParams: (input: TListInput, params: TListParams) => TListKeyParams
  buildDetailKeyParams: (
    input: TDetailInput,
    params: TDetailParams,
  ) => TDetailKeyParams
  queryKeys?: ProductListQueryKeys<TListKeyParams, TDetailKeyParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export interface ProductListQueryOptionsFactory<
  TProductList,
  TListInput extends ProductListListInputBase,
  TDetailInput extends ProductListDetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<ProductListListResult<TProductList>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<TProductList | null>
}

export const createProductListQueryOptionsFactory = <
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
>): ProductListQueryOptionsFactory<TProductList, TListInput, TDetailInput> => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductListQueryKeys<TListKeyParams, TDetailKeyParams>(
      queryKeyNamespace,
    )
  const buildList = buildListParams
  const buildDetail = buildDetailParams
  const buildListKey = buildListKeyParams
  const buildDetailKey = buildDetailKeyParams

  return {
    getDetailQueryOptions: (input, options) => {
      const detailParams = buildDetail(input)
      const cacheStrategy = options?.cacheStrategy ?? "userData"

      return {
        queryFn: async ({ signal }) => {
          if (
            input.id === undefined ||
            input.id === null ||
            input.id.length === 0
          ) {
            throw new Error("Product list id is required")
          }

          return await service.getProductList(detailParams, signal)
        },
        queryKey: resolvedQueryKeys.detail(buildDetailKey(input, detailParams)),
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
    getListQueryOptions: (input, options) => {
      const listParams = buildList(input)
      const cacheStrategy = options?.cacheStrategy ?? "userData"

      return {
        queryFn: async ({ signal }) =>
          await service.listProductLists(listParams, signal),
        queryKey: resolvedQueryKeys.list(buildListKey(input, listParams)),
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
  }
}
