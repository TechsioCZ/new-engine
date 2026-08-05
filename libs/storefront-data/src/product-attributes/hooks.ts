import { useQuery } from "@tanstack/react-query"

import type { CacheConfig } from "../shared/cache-config"
import { createCacheConfig } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type { ReadQueryOptions } from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { createProductAttributeQueryKeys } from "./query-keys"
import { createProductAttributeQueryOptionsFactory } from "./query-options"
import type { ProductAttributeQueryOptionsFactory } from "./query-options"
import type {
  ProductAttributeQueryKeys,
  ProductAttributeService,
  ProductAttributesInputBase,
  UseProductAttributesResult,
} from "./types"

export interface CreateProductAttributeHooksConfig<
  TAttribute,
  TInput extends ProductAttributesInputBase,
  TParams,
> {
  service: ProductAttributeService<TAttribute, TParams>
  buildDetailParams?: (input: TInput) => TParams
  queryKeys?: ProductAttributeQueryKeys<TParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
}

export interface ProductAttributeHooks<
  TAttribute,
  TInput extends ProductAttributesInputBase,
> {
  getDetailQueryOptions: ProductAttributeQueryOptionsFactory<
    TAttribute,
    TInput
  >["getDetailQueryOptions"]
  useProductAttributes: (
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TAttribute[]>
    }
  ) => UseProductAttributesResult<TAttribute>
}

export function createProductAttributeHooks<
  TAttribute,
  TInput extends ProductAttributesInputBase,
  TParams,
>({
  service,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
}: CreateProductAttributeHooksConfig<
  TAttribute,
  TInput,
  TParams
>): ProductAttributeHooks<TAttribute, TInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createProductAttributeQueryKeys<TParams>(queryKeyNamespace)
  const { getDetailQueryOptions } = createProductAttributeQueryOptionsFactory({
    service,
    ...(buildDetailParams === undefined ? {} : { buildDetailParams }),
    queryKeys: resolvedQueryKeys,
    cacheConfig: resolvedCacheConfig,
  })

  function useProductAttributes(
    input: TInput,
    options?: {
      queryOptions?: ReadQueryOptions<TAttribute[]>
    }
  ): UseProductAttributesResult<TAttribute> {
    const enabled = input.enabled ?? Boolean(input.productId)
    const query = useQuery({
      ...getDetailQueryOptions(
        input,
        options?.queryOptions === undefined
          ? {}
          : { queryOptions: options.queryOptions }
      ),
      enabled,
    })

    return {
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      productAttributes: query.data ?? [],
      query,
    }
  }

  return {
    getDetailQueryOptions,
    useProductAttributes,
  }
}
