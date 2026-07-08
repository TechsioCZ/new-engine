import { useQuery } from "@tanstack/react-query"
import type { CacheConfig } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type { ReadQueryOptions } from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import {
  createProductLocationAvailabilityQueryOptionsFactory,
  type ProductLocationAvailabilityQueryOptionsFactory,
} from "./query-options"
import { createProductLocationAvailabilityQueryKeys } from "./query-keys"
import type {
  ProductLocationAvailabilityInputBase,
  ProductLocationAvailabilityQueryKeys,
  ProductLocationAvailabilityService,
  UseProductLocationAvailabilityResult,
} from "./types"

export type CreateProductLocationAvailabilityHooksConfig<
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

export type ProductLocationAvailabilityHooks<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
> = {
  getDetailQueryOptions: ProductLocationAvailabilityQueryOptionsFactory<
    TResponse,
    TInput
  >["getDetailQueryOptions"]
  useProductLocationAvailability: (
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TResponse>
    }
  ) => UseProductLocationAvailabilityResult<TResponse>
}

export function createProductLocationAvailabilityHooks<
  TResponse,
  TInput extends ProductLocationAvailabilityInputBase,
  TParams,
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
>): ProductLocationAvailabilityHooks<TResponse, TInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductLocationAvailabilityQueryKeys<TParams>(queryKeyNamespace)
  const { getDetailQueryOptions } =
    createProductLocationAvailabilityQueryOptionsFactory({
      service,
      buildDetailParams,
      queryKeys: resolvedQueryKeys,
      cacheConfig: resolvedCacheConfig,
    })

  function useProductLocationAvailability(
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TResponse>
    }
  ): UseProductLocationAvailabilityResult<TResponse> {
    const enabled = input.enabled ?? Boolean(input.productId)
    const query = useQuery({
      ...getDetailQueryOptions(input, {
        queryOptions: options?.queryOptions,
      }),
      enabled,
    })

    return {
      productLocationAvailability: query.data ?? null,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isSuccess: query.isSuccess,
      error: toErrorMessage(query.error),
      query,
    }
  }

  return {
    getDetailQueryOptions,
    useProductLocationAvailability,
  }
}
