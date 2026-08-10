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

export interface CreateProductLocationAvailabilityQueryOptionsFactoryConfig<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
  TParams,
> {
  service: ProductLocationAvailabilityService<TResponse, TParams>
  buildDetailParams?: ((input: TInput) => TParams) | undefined
  queryKeys?: ProductLocationAvailabilityQueryKeys<TParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export interface ProductLocationAvailabilityQueryOptionsFactory<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
> {
  getDetailQueryOptions: (
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TResponse> | undefined
      cacheStrategy?: CacheStrategy
    },
  ) => QueryFactoryOptions<TResponse>
}

export const createProductLocationAvailabilityQueryOptionsFactory = <
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase & TParams,
  TParams = TInput,
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
>): ProductLocationAvailabilityQueryOptionsFactory<TResponse, TInput> => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductLocationAvailabilityQueryKeys<TParams>(queryKeyNamespace)
  const buildDetail = buildDetailParams ?? ((input: TInput) => input)

  return {
    getDetailQueryOptions: (input, options): QueryFactoryOptions<TResponse> => {
      const detailParams = buildDetail(input)
      const cacheStrategy = options?.cacheStrategy ?? "realtime"

      return {
        queryFn: async ({ signal }) => {
          if (
            input.productId === undefined ||
            input.productId === null ||
            input.productId.length === 0
          ) {
            throw new Error("Product id is required for location availability.")
          }

          return await service.getProductLocationAvailability(
            detailParams,
            signal,
          )
        },
        queryKey: resolvedQueryKeys.detail(detailParams),
        ...resolvedCacheConfig[cacheStrategy],
        ...options?.queryOptions,
      }
    },
  }
}
