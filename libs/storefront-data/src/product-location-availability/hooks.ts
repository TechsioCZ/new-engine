import { useQuery } from "@tanstack/react-query"

import type { CacheConfig } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type { ReadQueryOptions } from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createProductLocationAvailabilityQueryKeys } from "./query-keys"
import { createProductLocationAvailabilityQueryOptionsFactory } from "./query-options"
import type { ProductLocationAvailabilityQueryOptionsFactory } from "./query-options"
import type {
  ProductLocationAvailabilityInputBase,
  ProductLocationAvailabilityQueryKeys,
  ProductLocationAvailabilityService,
  UseProductLocationAvailabilityResult,
} from "./types"

export interface CreateProductLocationAvailabilityHooksConfig<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
  TParams,
> {
  service: ProductLocationAvailabilityService<TResponse, TParams>
  buildDetailParams?: (input: TInput) => TParams
  queryKeys?: ProductLocationAvailabilityQueryKeys<TParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export interface ProductLocationAvailabilityHooks<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
> {
  getDetailQueryOptions: ProductLocationAvailabilityQueryOptionsFactory<
    TResponse,
    TInput
  >["getDetailQueryOptions"]
  useProductLocationAvailability: (
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TResponse>
    },
  ) => UseProductLocationAvailabilityResult<TResponse>
}

export const createProductLocationAvailabilityHooks = <
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase & TParams,
  TParams = TInput,
>({
  service,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateProductLocationAvailabilityHooksConfig<
  TResponse,
  TInput,
  TParams
>): ProductLocationAvailabilityHooks<TResponse, TInput> => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductLocationAvailabilityQueryKeys<TParams>(queryKeyNamespace)
  const { getDetailQueryOptions } =
    createProductLocationAvailabilityQueryOptionsFactory({
      buildDetailParams,
      cacheConfig: resolvedCacheConfig,
      queryKeys: resolvedQueryKeys,
      service,
    })

  const useProductLocationAvailability = (
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TResponse>
    },
  ): UseProductLocationAvailabilityResult<TResponse> => {
    const enabled = input.enabled ?? Boolean(input.productId)
    const query = useQuery({
      ...getDetailQueryOptions(input, {
        queryOptions: options?.queryOptions,
      }),
      enabled,
    })

    return {
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      productLocationAvailability: query.data ?? null,
      query,
    }
  }

  return {
    getDetailQueryOptions,
    useProductLocationAvailability,
  }
}
