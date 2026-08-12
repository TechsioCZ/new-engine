import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createProductLocationAvailabilityQueryKeys } from "./query-keys"
import type {
  ProductLocationAvailabilityInputBase,
  ProductLocationAvailabilityQueryKeys,
  ProductLocationAvailabilityService,
} from "./types"

export type CreateProductLocationAvailabilityQueryOptionsFactoryConfig<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
  TParams,
> = {
  service: ProductLocationAvailabilityService<TResponse, TParams>
  buildDetailParams?: (input: TInput) => TParams
  queryKeys?: ProductLocationAvailabilityQueryKeys<TParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export type ProductLocationAvailabilityQueryOptionsFactory<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
> = {
  getDetailQueryOptions: (
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TResponse>
      cacheStrategy?: CacheStrategy
    }
  ) => QueryFactoryOptions<TResponse>
}

export function createProductLocationAvailabilityQueryOptionsFactory<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
  TParams,
>({
  service,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateProductLocationAvailabilityQueryOptionsFactoryConfig<
  TResponse,
  TInput,
  TParams
>): ProductLocationAvailabilityQueryOptionsFactory<TResponse, TInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductLocationAvailabilityQueryKeys<TParams>(queryKeyNamespace)
  const buildDetail =
    buildDetailParams ?? ((input: TInput) => input as unknown as TParams)

  return {
    getDetailQueryOptions: (
      input,
      options
    ): QueryFactoryOptions<TResponse> => {
      const detailParams = buildDetail(input)
      const cacheStrategy = options?.cacheStrategy ?? "realtime"

      return {
        queryKey: resolvedQueryKeys.detail(detailParams),
        queryFn: ({ signal }) => {
          if (!input.productId) {
            throw new Error("Product id is required for location availability.")
          }

          return service.getProductLocationAvailability(detailParams, signal)
        },
        ...resolvedCacheConfig[cacheStrategy],
        ...(options?.queryOptions ?? {}),
      }
    },
  }
}
