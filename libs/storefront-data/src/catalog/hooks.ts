import type { QueryClient } from "@tanstack/react-query"
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { omitUndefined } from "@techsio/std/object"

import {
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { shouldSkipPrefetch } from "../shared/prefetch"
import type { PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
import { useRegionContext } from "../shared/region-context"
import { useDelayedPrefetchController } from "../shared/use-delayed-prefetch-controller"
import { createCatalogQueryKeys } from "./query-keys"
import { createCatalogQueryOptionsFactory } from "./query-options"
import type {
  CatalogListInputBase,
  CatalogListResponse,
  CatalogQueryKeys,
  CatalogService,
  RegionInfo,
  UseCatalogProductsResult,
  UseSuspenseCatalogProductsResult,
} from "./types"
import { resolvePositiveInteger } from "./utils"

const resolveCatalogInput = <TInput extends CatalogListInputBase>(
  input: TInput,
  region?: RegionInfo | null,
): TInput => {
  const queryInput = { ...input }
  delete queryInput.enabled
  return applyRegion(queryInput, region)
}

export interface CreateCatalogHooksConfig<
  TProduct,
  TListInput extends CatalogListInputBase,
  TListParams,
  TFacets,
> {
  service: CatalogService<TProduct, TListParams, TFacets>
  buildListParams?: (input: TListInput) => TListParams
  queryKeys?: CatalogQueryKeys<TListParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
  requireRegion?: boolean
  fallbackFacets: TFacets
}

export const createCatalogHooks = <
  TProduct,
  TListInput extends CatalogListInputBase & TListParams,
  TListParams,
  TFacets,
>({
  service,
  buildListParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 12,
  requireRegion = true,
  fallbackFacets,
}: CreateCatalogHooksConfig<TProduct, TListInput, TListParams, TFacets>) => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createCatalogQueryKeys<TListParams>(queryKeyNamespace)
  const buildList = buildListParams ?? ((input: TListInput) => input)
  const { getListQueryOptions } = createCatalogQueryOptionsFactory({
    buildListParams: buildList,
    cacheConfig: resolvedCacheConfig,
    queryKeys: resolvedQueryKeys,
    service,
  })

  const useCatalogProducts = (
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      queryOptions?: ReadQueryOptions<CatalogListResponse<TProduct, TFacets>>
    },
  ): UseCatalogProductsResult<TProduct, TFacets> => {
    const contextRegion = useRegionContext()
    const inputEnabled = input.enabled
    const resolvedInput = resolveCatalogInput(input, contextRegion)
    const enabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"

    const query = useQuery({
      ...getListQueryOptions(
        input,
        omitUndefined({
          cacheStrategy,
          queryOptions: options?.queryOptions,
          region: contextRegion,
        }),
      ),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const inputPage = resolvePositiveInteger(resolvedInput.page, 1)
    const inputLimit = resolvePositiveInteger(
      resolvedInput.limit,
      defaultPageSize,
    )
    const currentPage = resolvePositiveInteger(data?.page, inputPage)
    const responseLimit = resolvePositiveInteger(data?.limit, inputLimit)
    const totalCount = data?.count ?? 0
    const totalPages =
      data?.totalPages ??
      (responseLimit > 0 ? Math.ceil(totalCount / responseLimit) : 0)

    return {
      currentPage,
      error: toErrorMessage(error),
      facets: data?.facets ?? fallbackFacets,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      isFetching,
      isLoading,
      isSuccess,
      products: data?.products ?? [],
      query,
      totalCount,
      totalPages,
    }
  }

  const useSuspenseCatalogProducts = (
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      queryOptions?: SuspenseQueryOptions<
        CatalogListResponse<TProduct, TFacets>
      >
    },
  ): UseSuspenseCatalogProductsResult<TProduct, TFacets> => {
    const contextRegion = useRegionContext()
    const resolvedInput = resolveCatalogInput(input, contextRegion)
    if (
      requireRegion &&
      (resolvedInput.region_id === undefined ||
        resolvedInput.region_id.length === 0)
    ) {
      throw new Error("Region is required for catalog queries")
    }

    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const query = useSuspenseQuery({
      ...getListQueryOptions(
        input,
        omitUndefined({
          cacheStrategy,
          queryOptions: options?.queryOptions,
          region: contextRegion,
        }),
      ),
    })
    const { data, isFetching } = query

    const inputPage = resolvePositiveInteger(resolvedInput.page, 1)
    const inputLimit = resolvePositiveInteger(
      resolvedInput.limit,
      defaultPageSize,
    )
    const currentPage = resolvePositiveInteger(data?.page, inputPage)
    const responseLimit = resolvePositiveInteger(data?.limit, inputLimit)
    const totalCount = data?.count ?? 0
    const totalPages =
      data?.totalPages ??
      (responseLimit > 0 ? Math.ceil(totalCount / responseLimit) : 0)

    return {
      currentPage,
      error: null,
      facets: data?.facets ?? fallbackFacets,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      isFetching,
      isLoading: false,
      isSuccess: true,
      products: data?.products ?? [],
      query,
      totalCount,
      totalPages,
    }
  }

  const usePrefetchCatalogProducts = (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()

    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 250
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy,
    )

    const prefetchCatalogProducts = async (input: TListInput) => {
      const inputEnabled = input.enabled
      const resolvedInput = resolveCatalogInput(input, contextRegion)
      const isEnabled =
        inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))
      if (!isEnabled) {
        return
      }

      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey,
          skipIfCached,
          skipMode,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery({
        queryFn: async ({ signal }) =>
          await service.getCatalogProducts(listParams, signal),
        queryKey,
        ...prefetchCacheOptions,
      })
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const resolvedInput = resolveCatalogInput(input, contextRegion)
      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(
        async () => {
          await prefetchCatalogProducts(input)
        },
        id,
        delay,
      )
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchCatalogProducts,
    }
  }

  const prefetchCatalogProducts = async (
    queryClient: QueryClient,
    input: TListInput,
    region?: RegionInfo | null,
  ) => {
    const inputEnabled = input.enabled
    const resolvedInput = resolveCatalogInput(input, region)
    const isEnabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))
    if (!isEnabled) {
      return
    }
    await queryClient.prefetchQuery(
      getListQueryOptions(
        input,
        omitUndefined({
          cacheStrategy: "semiStatic" as const,
          region,
        }),
      ),
    )
  }

  return {
    getListQueryOptions,
    prefetchCatalogProducts,
    useCatalogProducts,
    usePrefetchCatalogProducts,
    useSuspenseCatalogProducts,
  }
}

export type CatalogHooks<
  TProduct,
  TListInput extends CatalogListInputBase & TListParams,
  TListParams,
  TFacets,
> = ReturnType<
  typeof createCatalogHooks<TProduct, TListInput, TListParams, TFacets>
>
