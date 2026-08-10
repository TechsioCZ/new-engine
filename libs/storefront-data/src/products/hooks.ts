import type { DefaultError } from "@tanstack/react-query"
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import {
  getRecordValue,
  isRecord,
  omitKeys,
  omitUndefined,
} from "@techsio/std/object"
import { useEffect } from "react"

import {
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  InfiniteQueryOptions,
  QueryFactoryOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { resolvePagination } from "../shared/pagination"
import { shouldSkipPrefetch } from "../shared/prefetch"
import type { PrefetchSkipMode } from "../shared/prefetch"
import { createPrefetchPagesPlan } from "../shared/prefetch-pages-plan"
import { appendQueryKey } from "../shared/query-keys"
import type { QueryNamespace } from "../shared/query-keys"
import { useRegionContext } from "../shared/region-context"
import { useDelayedPrefetchController } from "../shared/use-delayed-prefetch-controller"
import {
  createProductDetailQueryDefinition,
  createProductListQueryDefinition,
  resolveProductQueryInput,
} from "./query-definition"
import { createProductQueryKeys } from "./query-keys"
import { createProductQueryOptionsFactory } from "./query-options"
import type {
  ProductDetailInputBase,
  ProductInfiniteData,
  ProductInfiniteInputBase,
  ProductListInputBase,
  ProductListResponse,
  ProductQueryKeys,
  ProductService,
  RegionInfo,
  UseInfiniteProductsResult,
  UseProductResult,
  UseProductsResult,
  UseSuspenseProductResult,
  UseSuspenseProductsResult,
} from "./types"

type SuspenseInput<TInput> = Omit<TInput, "enabled">

interface InfiniteProductsPageParam {
  offset: number
  page: number
}

const getNumberProperty = (
  value: unknown,
  property: string,
): number | undefined => {
  if (!isRecord(value)) {
    return undefined
  }

  const propertyValue = getRecordValue(value, property)
  return typeof propertyValue === "number" ? propertyValue : undefined
}

const isInfiniteProductsPageParam = (
  pageParam: unknown,
): pageParam is InfiniteProductsPageParam =>
  getNumberProperty(pageParam, "offset") !== undefined &&
  getNumberProperty(pageParam, "page") !== undefined

const resolveInfiniteProductsPageParam = ({
  baseOffset,
  basePage,
  pageParam,
  resolvedLimit,
}: {
  baseOffset: number
  basePage: number
  pageParam: unknown
  resolvedLimit: number
}): InfiniteProductsPageParam => {
  if (isInfiniteProductsPageParam(pageParam)) {
    return pageParam
  }

  const offset = typeof pageParam === "number" ? pageParam : baseOffset
  const page =
    resolvedLimit > 0
      ? basePage +
        Math.max(Math.floor((offset - baseOffset) / resolvedLimit), 0)
      : basePage

  return { offset, page }
}

const hasText = (value: string | undefined): value is string =>
  typeof value === "string" && value.length > 0

const runBestEffortPrefetch = async (
  prefetch: () => Promise<unknown>,
): Promise<void> => {
  await Promise.allSettled([prefetch()])
}

class ParameterCloner {
  private readonly cloneObject: (input: object) => object

  constructor(cloneObject: (input: object) => object) {
    this.cloneObject = cloneObject
  }

  clone<TOutput>(input: object, target?: TOutput): TOutput
  clone(input: object): unknown {
    return this.cloneObject(input)
  }
}

const parameterCloner = new ParameterCloner((input) => ({ ...input }))

const schedulePagePrefetches = (
  pages: number[],
  delay: number,
  prefetchPage: (page: number) => Promise<unknown>,
): ReturnType<typeof setTimeout> | undefined => {
  if (pages.length === 0) {
    return undefined
  }

  return setTimeout(() => {
    for (const page of pages) {
      void runBestEffortPrefetch(async () => {
        await prefetchPage(page)
      })
    }
  }, delay)
}

export interface PrefetchListOptions {
  cacheStrategy?: CacheStrategy
  prefetchedBy?: string
  useGlobalFetcher?: boolean
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export interface PrefetchProductOptions {
  cacheStrategy?: CacheStrategy
  prefetchedBy?: string
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export interface UsePrefetchPagesParams<TListInput> {
  enabled?: boolean
  shouldPrefetch?: boolean
  baseInput: TListInput
  currentPage: number
  hasNextPage: boolean
  hasPrevPage: boolean
  totalPages: number
  pageSize: number
  mode?: "priority" | "simple"
  cacheStrategy?: CacheStrategy
  delays?: {
    medium?: number
    low?: number
  }
}

export interface CreateProductHooksConfig<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
> {
  service: ProductService<TProduct, TListParams, TDetailParams>
  buildListParams?: (input: TListInput) => TListParams
  buildPrefetchParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  queryKeys?: ProductQueryKeys<TListParams, TDetailParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
  requireRegion?: boolean
}

export interface ProductHooks<
  TProduct,
  TListInput extends ProductListInputBase,
  TDetailInput extends ProductDetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
    },
  ) => QueryFactoryOptions<ProductListResponse<TProduct>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProduct | null>
      region?: RegionInfo | null
    },
  ) => QueryFactoryOptions<TProduct | null>
  useProducts: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
    },
  ) => UseProductsResult<TProduct>
  useInfiniteProducts: (
    input: TListInput & ProductInfiniteInputBase,
    options?: {
      queryOptions?: InfiniteQueryOptions<
        ProductListResponse<TProduct>,
        DefaultError,
        ProductInfiniteData<TProduct>
      >
    },
  ) => UseInfiniteProductsResult<TProduct>
  useSuspenseProducts: (
    input: SuspenseInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListResponse<TProduct>>
    },
  ) => UseSuspenseProductsResult<TProduct>
  useProduct: (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TProduct | null> },
  ) => UseProductResult<TProduct>
  useSuspenseProduct: (
    input: SuspenseInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TProduct | null> },
  ) => UseSuspenseProductResult<TProduct>
  usePrefetchProducts: (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    prefetchProducts: (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions,
    ) => Promise<void>
    prefetchFirstPage: (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions,
    ) => Promise<void>
    delayedPrefetch: (
      input: TListInput,
      delay?: number,
      prefetchId?: string,
    ) => string
    cancelPrefetch: (prefetchId: string) => void
  }
  usePrefetchProduct: (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    prefetchProduct: (
      input: TDetailInput,
      prefetchOptions?: PrefetchProductOptions,
    ) => Promise<void>
    delayedPrefetch: (
      input: TDetailInput,
      delay?: number,
      prefetchId?: string,
    ) => string
    cancelPrefetch: (prefetchId: string) => void
  }
  usePrefetchPages: (params: UsePrefetchPagesParams<TListInput>) => void
}

export const createProductHooks = function createProductHooks<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
>({
  service,
  buildListParams,
  buildPrefetchParams,
  buildDetailParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
  requireRegion = true,
}: CreateProductHooksConfig<
  TProduct,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams
>): ProductHooks<TProduct, TListInput, TDetailInput> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ??
    ((input: TListInput) => parameterCloner.clone<TListParams>(input))
  const buildPrefetch = buildPrefetchParams ?? buildList
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => parameterCloner.clone<TDetailParams>(input))
  const { getListQueryOptions, getDetailQueryOptions } =
    createProductQueryOptionsFactory({
      buildDetailParams: buildDetail,
      buildListParams: buildList,
      cacheConfig: resolvedCacheConfig,
      queryKeys: resolvedQueryKeys,
      service,
    })

  const createProductsListPrefetchQueryOptions = (
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
    },
  ) => {
    const { queryKey, queryFn } = createProductListQueryDefinition({
      buildListParams: buildList,
      input,
      queryKeys: resolvedQueryKeys,
      service,
      ...(options?.region === undefined ? {} : { region: options.region }),
      ...(options?.useGlobalFetcher === undefined
        ? {}
        : { useGlobalFetcher: options.useGlobalFetcher }),
    })
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "semiStatic",
    )

    return omitUndefined({
      ...prefetchCacheOptions,
      meta:
        options?.prefetchedBy === undefined
          ? undefined
          : { prefetchedBy: options.prefetchedBy },
      queryFn,
      queryKey,
    })
  }

  const createProductsFirstPagePrefetchQueryOptions = (
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
    },
  ) => {
    const { queryKey, queryFn } = createProductListQueryDefinition({
      buildListParams: buildPrefetch,
      input,
      queryKeys: resolvedQueryKeys,
      service,
      ...(options?.region === undefined ? {} : { region: options.region }),
      ...(options?.useGlobalFetcher === undefined
        ? {}
        : { useGlobalFetcher: options.useGlobalFetcher }),
      transformInput: (resolvedInput: TListInput) => ({
        ...resolvedInput,
        offset: 0,
        page: 1,
      }),
    })
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "semiStatic",
    )

    return omitUndefined({
      ...prefetchCacheOptions,
      meta:
        options?.prefetchedBy === undefined
          ? undefined
          : { prefetchedBy: options.prefetchedBy },
      queryFn,
      queryKey,
    })
  }

  const createProductPrefetchQueryOptions = (
    input: TDetailInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
      region?: RegionInfo | null
    },
  ) => {
    const { queryKey, queryFn } = createProductDetailQueryDefinition({
      buildDetailParams: buildDetail,
      input,
      queryKeys: resolvedQueryKeys,
      service,
      ...(options?.region === undefined ? {} : { region: options.region }),
    })
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "semiStatic",
    )

    return omitUndefined({
      ...prefetchCacheOptions,
      meta:
        options?.prefetchedBy === undefined
          ? undefined
          : { prefetchedBy: options.prefetchedBy },
      queryFn,
      queryKey,
    })
  }

  const useProducts = (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
    },
  ): UseProductsResult<TProduct> => {
    const contextRegion = useRegionContext()
    const inputEnabled = input.enabled
    const resolvedInput = resolveProductQueryInput(input, contextRegion)
    const listParams = buildList(resolvedInput)
    const enabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))

    const query = useQuery({
      ...getListQueryOptions(
        input,
        omitUndefined({
          queryOptions: options?.queryOptions,
          region: contextRegion,
        }),
      ),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const limitFromParams = getNumberProperty(listParams, "limit")
    const offsetFromParams = getNumberProperty(listParams, "offset")
    const pagination = resolvePagination(
      omitUndefined({
        limit: limitFromParams ?? resolvedInput.limit,
        offset: offsetFromParams,
        page: resolvedInput.page,
      }),
      defaultPageSize,
    )

    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      currentPage: pagination.page,
      error: toErrorMessage(error),
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      isFetching,
      isLoading,
      isSuccess,
      products: data?.products ?? [],
      query,
      totalCount,
      totalPages,
    }
  }

  const resolveInfiniteProductsInput = (
    input: TListInput & ProductInfiniteInputBase,
    contextRegion: RegionInfo | null,
  ) => {
    const inputEnabled = input.enabled
    const { initialLimit } = input
    const baseInput = omitKeys(input, ["enabled", "initialLimit"])
    const resolvedInput = resolveProductQueryInput(
      parameterCloner.clone<TListInput>(baseInput),
      contextRegion,
    )
    const enabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))

    const limitFromInput = resolvedInput.limit
    const resolvedLimit =
      typeof limitFromInput === "number" && limitFromInput > 0
        ? limitFromInput
        : defaultPageSize
    const resolvedInitialLimit =
      typeof initialLimit === "number" && initialLimit > 0
        ? initialLimit
        : undefined
    const initialPageLimit = resolvedInitialLimit ?? resolvedLimit
    const offsetFromInput = getNumberProperty(resolvedInput, "offset")
    const pageFromInput = resolvedInput.page ?? 1
    const baseOffset =
      typeof offsetFromInput === "number"
        ? offsetFromInput
        : (pageFromInput - 1) * resolvedLimit

    return {
      baseOffset,
      basePage: pageFromInput,
      enabled,
      initialPageLimit,
      resolvedInitialLimit,
      resolvedInput,
      resolvedLimit,
    }
  }

  const buildInfiniteProductsQueryKey = (
    baseListParams: TListParams,
    resolvedInitialLimit: number | undefined,
  ): readonly unknown[] => {
    const infiniteBaseQueryKey = resolvedQueryKeys.infinite
      ? resolvedQueryKeys.infinite(baseListParams)
      : appendQueryKey(resolvedQueryKeys.list(baseListParams), "infinite")

    if (typeof resolvedInitialLimit !== "number") {
      return infiniteBaseQueryKey
    }

    return appendQueryKey(infiniteBaseQueryKey, {
      initialLimit: resolvedInitialLimit,
    })
  }

  const useInfiniteProducts = (
    input: TListInput & ProductInfiniteInputBase,
    options?: {
      queryOptions?: InfiniteQueryOptions<
        ProductListResponse<TProduct>,
        DefaultError,
        ProductInfiniteData<TProduct>
      >
    },
  ): UseInfiniteProductsResult<TProduct> => {
    const contextRegion = useRegionContext()
    const {
      enabled,
      resolvedInput,
      resolvedLimit,
      resolvedInitialLimit,
      initialPageLimit,
      baseOffset,
      basePage,
    } = resolveInfiniteProductsInput(input, contextRegion)

    const baseListParams = buildList(resolvedInput)
    const resolvedQueryKey = buildInfiniteProductsQueryKey(
      baseListParams,
      resolvedInitialLimit,
    )
    const query = useInfiniteQuery<
      ProductListResponse<TProduct>,
      DefaultError,
      ProductInfiniteData<TProduct>
    >({
      enabled,
      getNextPageParam: (lastPage, _pages, lastPageParam) => {
        const { page } = resolveInfiniteProductsPageParam({
          baseOffset,
          basePage,
          pageParam: lastPageParam,
          resolvedLimit,
        })
        const limit = lastPage.limit ?? resolvedLimit
        const offset = lastPage.offset ?? 0
        const moreItemsExist = lastPage.count > offset + limit
        return moreItemsExist
          ? {
              offset: offset + limit,
              page: page + 1,
            }
          : undefined
      },
      initialPageParam: {
        offset: baseOffset,
        page: basePage,
      },
      queryFn: async ({ pageParam, signal }) => {
        const { offset, page } = resolveInfiniteProductsPageParam({
          baseOffset,
          basePage,
          pageParam,
          resolvedLimit,
        })
        const limitForPage =
          page === basePage ? initialPageLimit : resolvedLimit
        const pageInput = parameterCloner.clone<TListInput>({
          ...resolvedInput,
          limit: limitForPage,
          offset,
          page,
        })
        const listParams = buildList(pageInput)
        return await service.getProducts(listParams, signal)
      },
      queryKey: resolvedQueryKey,
      ...resolvedCacheConfig.semiStatic,
      ...options?.queryOptions,
    })
    const {
      data,
      isLoading,
      isFetching,
      isFetchingNextPage,
      hasNextPage,
      fetchNextPage,
      refetch,
      error,
      isSuccess,
    } = query

    return {
      error: toErrorMessage(error),
      fetchNextPage: async () => await fetchNextPage(),
      hasNextPage: hasNextPage ?? false,
      isFetching,
      isFetchingNextPage,
      isLoading,
      isSuccess,
      products: data?.pages.flatMap((page) => page.products) ?? [],
      query,
      refetch: async () => await refetch(),
      totalCount: data?.pages[0]?.count ?? 0,
    }
  }

  const useSuspenseProducts = (
    input: SuspenseInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListResponse<TProduct>>
    },
  ): UseSuspenseProductsResult<TProduct> => {
    const contextRegion = useRegionContext()
    const queryInput = parameterCloner.clone<TListInput>(input)
    const resolvedInput = resolveProductQueryInput(queryInput, contextRegion)

    if (requireRegion && !hasText(resolvedInput.region_id)) {
      throw new Error("Region is required for product queries")
    }

    const listParams = buildList(resolvedInput)
    const query = useSuspenseQuery(
      getListQueryOptions(
        queryInput,
        omitUndefined({
          queryOptions: options?.queryOptions,
          region: contextRegion,
        }),
      ),
    )
    const { data, isFetching } = query

    const limitFromParams = getNumberProperty(listParams, "limit")
    const offsetFromParams = getNumberProperty(listParams, "offset")
    const pagination = resolvePagination(
      omitUndefined({
        limit: limitFromParams ?? resolvedInput.limit,
        offset: offsetFromParams,
        page: resolvedInput.page,
      }),
      defaultPageSize,
    )

    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      currentPage: pagination.page,
      error: null,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      isFetching,
      isLoading: false,
      isSuccess: true,
      products: data?.products ?? [],
      query,
      totalCount,
      totalPages,
    }
  }

  const useProduct = (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TProduct | null> },
  ): UseProductResult<TProduct> => {
    const contextRegion = useRegionContext()
    const inputEnabled = input.enabled
    const resolvedInput = resolveProductQueryInput(input, contextRegion)
    const enabled =
      inputEnabled ??
      (Boolean(resolvedInput.handle) &&
        (!requireRegion || Boolean(resolvedInput.region_id)))

    const query = useQuery({
      ...getDetailQueryOptions(
        input,
        omitUndefined({
          queryOptions: options?.queryOptions,
          region: contextRegion,
        }),
      ),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      error: toErrorMessage(error),
      isFetching,
      isLoading,
      isSuccess,
      product: data ?? null,
      query,
    }
  }

  const useSuspenseProduct = (
    input: SuspenseInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TProduct | null> },
  ): UseSuspenseProductResult<TProduct> => {
    const contextRegion = useRegionContext()
    const queryInput = parameterCloner.clone<TDetailInput>(input)
    const resolvedInput = resolveProductQueryInput(queryInput, contextRegion)

    if (requireRegion && !hasText(resolvedInput.region_id)) {
      throw new Error("Region is required for product queries")
    }

    if (!hasText(resolvedInput.handle)) {
      throw new Error("Product handle is required for product queries")
    }

    const query = useSuspenseQuery(
      getDetailQueryOptions(
        queryInput,
        omitUndefined({
          queryOptions: options?.queryOptions,
          region: contextRegion,
        }),
      ),
    )
    const { data, isFetching } = query

    return {
      error: null,
      isFetching,
      isLoading: false,
      isSuccess: true,
      product: data ?? null,
      query,
    }
  }

  const usePrefetchProducts = (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 800
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"

    const prefetchProducts = async (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions,
    ) => {
      const resolvedInput = resolveProductQueryInput(input, contextRegion)
      if (requireRegion && !hasText(resolvedInput.region_id)) {
        return
      }
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher === true
          ? service.getProductsGlobal
          : undefined
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved,
      )

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey: createProductsListPrefetchQueryOptions(
            input,
            omitUndefined({
              cacheStrategy: cacheStrategyResolved,
              region: contextRegion,
              useGlobalFetcher: Boolean(useGlobalFetcher),
            }),
          ).queryKey,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(
        createProductsListPrefetchQueryOptions(
          input,
          omitUndefined({
            cacheStrategy: cacheStrategyResolved,
            prefetchedBy: prefetchOptions?.prefetchedBy,
            region: contextRegion,
            useGlobalFetcher: Boolean(useGlobalFetcher),
          }),
        ),
      )
    }

    const prefetchFirstPage = async (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions,
    ) => {
      const resolvedInput = resolveProductQueryInput(input, contextRegion)
      if (requireRegion && !hasText(resolvedInput.region_id)) {
        return
      }
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher === true
          ? service.getProductsGlobal
          : undefined
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved,
      )

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey: createProductsFirstPagePrefetchQueryOptions(
            input,
            omitUndefined({
              cacheStrategy: cacheStrategyResolved,
              region: contextRegion,
              useGlobalFetcher: Boolean(useGlobalFetcher),
            }),
          ).queryKey,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(
        createProductsFirstPagePrefetchQueryOptions(
          input,
          omitUndefined({
            cacheStrategy: cacheStrategyResolved,
            prefetchedBy: prefetchOptions?.prefetchedBy,
            region: contextRegion,
            useGlobalFetcher: Boolean(useGlobalFetcher),
          }),
        ),
      )
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const resolvedInput = resolveProductQueryInput(input, contextRegion)
      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(
        async () => {
          await prefetchProducts(input)
        },
        id,
        delay,
      )
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchFirstPage,
      prefetchProducts,
    }
  }

  const usePrefetchProduct = (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 400
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"

    const prefetchProduct = async (
      input: TDetailInput,
      prefetchOptions?: PrefetchProductOptions,
    ) => {
      const resolvedInput = resolveProductQueryInput(input, contextRegion)
      if (requireRegion && !hasText(resolvedInput.region_id)) {
        return
      }
      if (!hasText(resolvedInput.handle)) {
        return
      }
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved,
      )

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey: createProductPrefetchQueryOptions(
            input,
            omitUndefined({
              cacheStrategy: cacheStrategyResolved,
              region: contextRegion,
            }),
          ).queryKey,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(
        createProductPrefetchQueryOptions(
          input,
          omitUndefined({
            cacheStrategy: cacheStrategyResolved,
            prefetchedBy: prefetchOptions?.prefetchedBy,
            region: contextRegion,
          }),
        ),
      )
    }

    const delayedPrefetch = (
      input: TDetailInput,
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const resolvedInput = resolveProductQueryInput(input, contextRegion)
      const detailParams = buildDetail(resolvedInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(
        async () => {
          await prefetchProduct(input)
        },
        id,
        delay,
      )
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchProduct,
    }
  }

  const usePrefetchPages = (
    params: UsePrefetchPagesParams<TListInput>,
  ): void => {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const resolvedBaseInput = resolveProductQueryInput(
      params.baseInput,
      contextRegion,
    )

    useEffect(() => {
      const timers: ReturnType<typeof setTimeout>[] = []

      if (
        params.enabled === false ||
        params.shouldPrefetch === false ||
        (requireRegion && !hasText(resolvedBaseInput.region_id))
      ) {
        return () => {
          timers.length = 0
        }
      }

      const cacheStrategy = params.cacheStrategy ?? "semiStatic"
      const mode = params.mode ?? "priority"
      const mediumDelay = params.delays?.medium ?? 500
      const lowDelay = params.delays?.low ?? 1500

      const prefetchPage = async (page: number) => {
        const inputWithPage = parameterCloner.clone<TListInput>({
          ...resolvedBaseInput,
          limit: params.pageSize,
          page,
        })

        await queryClient.prefetchQuery(
          createProductsListPrefetchQueryOptions(inputWithPage, {
            cacheStrategy,
          }),
        )
      }

      const plan = createPrefetchPagesPlan({
        currentPage: params.currentPage,
        hasNextPage: params.hasNextPage,
        hasPrevPage: params.hasPrevPage,
        mode,
        totalPages: params.totalPages,
      })

      for (const page of plan.immediate) {
        void runBestEffortPrefetch(async () => {
          await prefetchPage(page)
        })
      }

      const mediumTimer = schedulePagePrefetches(
        plan.medium,
        mediumDelay,
        prefetchPage,
      )
      const lowTimer = schedulePagePrefetches(plan.low, lowDelay, prefetchPage)
      if (mediumTimer !== undefined) {
        timers.push(mediumTimer)
      }
      if (lowTimer !== undefined) {
        timers.push(lowTimer)
      }

      return () => {
        for (const timer of timers) {
          clearTimeout(timer)
        }
      }
    }, [
      params.enabled,
      params.shouldPrefetch,
      resolvedBaseInput,
      params.currentPage,
      params.hasNextPage,
      params.hasPrevPage,
      params.totalPages,
      params.pageSize,
      params.mode,
      params.cacheStrategy,
      params.delays?.medium,
      params.delays?.low,
      queryClient,
    ])
  }

  return {
    getDetailQueryOptions,
    getListQueryOptions,
    useInfiniteProducts,
    usePrefetchPages,
    usePrefetchProduct,
    usePrefetchProducts,
    useProduct,
    useProducts,
    useSuspenseProduct,
    useSuspenseProducts,
  }
}
