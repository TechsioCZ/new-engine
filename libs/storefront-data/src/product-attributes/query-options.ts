import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createProductAttributeQueryKeys } from "./query-keys"
import type {
  ProductAttributeQueryKeys,
  ProductAttributeService,
  ProductAttributesInputBase,
} from "./types"

export type CreateProductAttributeQueryOptionsFactoryConfig<
  TAttribute,
  TInput extends ProductAttributesInputBase,
  TParams,
> = {
  service: ProductAttributeService<TAttribute, TParams>
  buildDetailParams?: (input: TInput) => TParams
  queryKeys?: ProductAttributeQueryKeys<TParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export type ProductAttributeQueryOptionsFactory<
  TAttribute,
  TInput extends ProductAttributesInputBase,
> = {
  getDetailQueryOptions: (
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TAttribute[]>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TAttribute[]>
}

export function createProductAttributeQueryOptionsFactory<
  TAttribute,
  TInput extends ProductAttributesInputBase,
  TParams,
>({
  service,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateProductAttributeQueryOptionsFactoryConfig<
  TAttribute,
  TInput,
  TParams
>): ProductAttributeQueryOptionsFactory<TAttribute, TInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createProductAttributeQueryKeys<TParams>(queryKeyNamespace)
  const buildDetail =
    buildDetailParams ?? ((input: TInput) => input as unknown as TParams)

  return {
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TAttribute[]> => {
      const detailParams = buildDetail(input)
      const cacheStrategy = options?.cacheStrategy ?? "realtime"

      return {
        queryKey: resolvedQueryKeys.detail(detailParams),
        queryFn: ({ signal }) => {
          if (!input.productId) {
            throw new Error("Product id is required for Product Attributes.")
          }

          return service.getProductAttributes(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
