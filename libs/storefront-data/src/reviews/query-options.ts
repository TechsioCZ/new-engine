import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createDefaultListParams } from "./input-utils"
import { createProductReviewQueryKeys } from "./query-keys"
import type {
  ProductReviewListInputBase,
  ProductReviewListResponse,
  ProductReviewQueryKeys,
  ProductReviewService,
} from "./types"

type ProductReviewListService<TReview, TListParams> = Pick<
  ProductReviewService<TReview, TListParams>,
  "listProductReviews"
>

export type CreateProductReviewQueryOptionsFactoryConfig<
  TReview,
  TListInput extends ProductReviewListInputBase,
  TListParams,
> = {
  service: ProductReviewListService<TReview, TListParams>
  buildListParams?: (input: TListInput) => TListParams
  queryKeys?: ProductReviewQueryKeys<TListParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

export type ProductReviewQueryOptionsFactory<
  TReview,
  TListInput extends ProductReviewListInputBase,
> = {
  getProductReviewsQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductReviewListResponse<TReview>>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<ProductReviewListResponse<TReview>>
}

export function createProductReviewQueryOptionsFactory<
  TReview,
  TListInput extends ProductReviewListInputBase,
  TListParams,
>({
  service,
  buildListParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
}: CreateProductReviewQueryOptionsFactoryConfig<
  TReview,
  TListInput,
  TListParams
>): ProductReviewQueryOptionsFactory<TReview, TListInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createProductReviewQueryKeys<TListParams>(queryKeyNamespace)
  const buildList =
    buildListParams ??
    ((input: TListInput) =>
      createDefaultListParams(input, defaultPageSize) as TListParams)

  return {
    getProductReviewsQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<ProductReviewListResponse<TReview>> => {
      const listParams = buildList(input)
      const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

      return {
        queryKey: resolvedQueryKeys.productList(listParams),
        queryFn: ({ signal }) => service.listProductReviews(listParams, signal),
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
