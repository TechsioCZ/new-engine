import type { DefaultError } from "@tanstack/react-query"
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useEffect, useMemo } from "react"
import {
  type CacheConfig,
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  InfiniteQueryOptions,
  QueryFactoryOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { resolvePagination } from "../shared/pagination"
import { type PrefetchSkipMode, shouldSkipPrefetch } from "../shared/prefetch"
import { createPrefetchPagesPlan } from "../shared/prefetch-pages-plan"
import type { QueryNamespace } from "../shared/query-keys"
import { applyRegion } from "../shared/region"
import { useRegionContext } from "../shared/region-context"
import { useDelayedPrefetchController } from "../shared/use-delayed-prefetch-controller"
import { createProductQueryKeys } from "./query-keys"
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

type CacheStrategy = keyof CacheConfig
type SuspenseInput<TInput> = Omit<TInput, "enabled">

export type PrefetchListOptions = {
  cacheStrategy?: CacheStrategy
  prefetchedBy?: string
  useGlobalFetcher?: boolean
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export type PrefetchProductOptions = {
  cacheStrategy?: CacheStrategy
  prefetchedBy?: string
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export type UsePrefetchPagesParams<TListInput> = {
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

export type CreateProductHooksConfig<
  TProduct,
  TListInput extends ProductListInputBase,
  TListParams,
  TDetailInput extends ProductDetailInputBase,
  TDetailParams,
> = {
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

export type ProductHooks<
  TProduct,
  TListInput extends ProductListInputBase,
  TDetailInput extends ProductDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
    }
  ) => QueryFactoryOptions<ProductListResponse<TProduct>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProduct | null>
      region?: RegionInfo | null
    }
  ) => QueryFactoryOptions<TProduct | null>
  useProducts: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
    }
  ) => UseProductsResult<TProduct>
  useInfiniteProducts: (
    input: TListInput & ProductInfiniteInputBase,
    options?: {
      queryOptions?: InfiniteQueryOptions<
        ProductListResponse<TProduct>,
        DefaultError,
        ProductInfiniteData<TProduct>
      >
    }
  ) => UseInfiniteProductsResult<TProduct>
  useSuspenseProducts: (
    input: SuspenseInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListResponse<TProduct>>
    }
  ) => UseSuspenseProductsResult<TProduct>
  useProduct: (
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TProduct | null> }
  ) => UseProductResult<TProduct>
  useSuspenseProduct: (
    input: SuspenseInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TProduct | null> }
  ) => UseSuspenseProductResult<TProduct>
  usePrefetchProducts: (options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) => {
    prefetchProducts: (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions
    ) => Promise<void>
    prefetchFirstPage: (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions
    ) => Promise<void>
    delayedPrefetch: (
      input: TListInput,
      delay?: number,
      prefetchId?: string
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
      prefetchOptions?: PrefetchProductOptions
    ) => Promise<void>
    delayedPrefetch: (
      input: TDetailInput,
      delay?: number,
      prefetchId?: string
    ) => string
    cancelPrefetch: (prefetchId: string) => void
  }
  usePrefetchPages: (params: UsePrefetchPagesParams<TListInput>) => void
}

export function createProductHooks<
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
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildPrefetch =
    buildPrefetchParams ?? ((input: TListInput) => buildList(input))
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  const resolveListInput = (input: TListInput, region?: RegionInfo | null) => {
    const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
      enabled?: boolean
    }

    return applyRegion(baseInput as TListInput, region ?? undefined)
  }

  const resolveDetailInput = (
    input: TDetailInput,
    region?: RegionInfo | null
  ) => {
    const { enabled: _inputEnabled, ...baseInput } = input as TDetailInput & {
      enabled?: boolean
    }

    return applyRegion(baseInput as TDetailInput, region ?? undefined)
  }

  const getListQueryOptions = (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
    }
  ) => {
    const resolvedInput = resolveListInput(input, options?.region)
    const listParams = buildList(resolvedInput)
    const useGlobalFetcher =
      options?.useGlobalFetcher && service.getProductsGlobal

    return {
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        useGlobalFetcher
          ? (service.getProductsGlobal?.(listParams, signal) ??
            service.getProducts(listParams, signal))
          : service.getProducts(listParams, signal),
      ...resolvedCacheConfig.semiStatic,
      ...(options?.queryOptions ?? {}),
    }
  }

  const createProductsListPrefetchQueryOptions = (
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
    }
  ) => {
    const resolvedInput = resolveListInput(input, options?.region)
    const listParams = buildList(resolvedInput)
    const useGlobalFetcher =
      options?.useGlobalFetcher && service.getProductsGlobal
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "semiStatic"
    )

    return {
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        useGlobalFetcher
          ? (service.getProductsGlobal?.(listParams, signal) ??
            service.getProducts(listParams, signal))
          : service.getProducts(listParams, signal),
      ...prefetchCacheOptions,
      meta: options?.prefetchedBy
        ? { prefetchedBy: options.prefetchedBy }
        : undefined,
    }
  }

  const createProductsFirstPagePrefetchQueryOptions = (
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
      region?: RegionInfo | null
      useGlobalFetcher?: boolean
    }
  ) => {
    const resolvedInput = resolveListInput(input, options?.region)
    const firstPageInput = {
      ...resolvedInput,
      page: 1,
      offset: 0,
    } as TListInput
    const listParams = buildPrefetch(firstPageInput)
    const useGlobalFetcher =
      options?.useGlobalFetcher && service.getProductsGlobal
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "semiStatic"
    )

    return {
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }: { signal?: AbortSignal }) =>
        useGlobalFetcher
          ? (service.getProductsGlobal?.(listParams, signal) ??
            service.getProducts(listParams, signal))
          : service.getProducts(listParams, signal),
      ...prefetchCacheOptions,
      meta: options?.prefetchedBy
        ? { prefetchedBy: options.prefetchedBy }
        : undefined,
    }
  }

  const getDetailQueryOptions = (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProduct | null>
      region?: RegionInfo | null
    }
  ) => {
    const resolvedInput = resolveDetailInput(input, options?.region)
    const detailParams = buildDetail(resolvedInput)

    return {
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: ({ signal }: { signal?: AbortSignal }) => {
        if (!resolvedInput.handle) {
          throw new Error("Product handle is required for product queries")
        }

        return service.getProductByHandle(detailParams, signal)
      },
      ...resolvedCacheConfig.semiStatic,
      ...(options?.queryOptions ?? {}),
    }
  }

  const createProductPrefetchQueryOptions = (
    input: TDetailInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
      region?: RegionInfo | null
    }
  ) => {
    const resolvedInput = resolveDetailInput(input, options?.region)
    const detailParams = buildDetail(resolvedInput)
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "semiStatic"
    )

    return {
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: ({ signal }: { signal?: AbortSignal }) => {
        if (!resolvedInput.handle) {
          throw new Error("Product handle is required for product queries")
        }

        return service.getProductByHandle(detailParams, signal)
      },
      ...prefetchCacheOptions,
      meta: options?.prefetchedBy
        ? { prefetchedBy: options.prefetchedBy }
        : undefined,
    }
  }

  function useProducts(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
    }
  ): UseProductsResult<TProduct> {
    const contextRegion = useRegionContext()
    const { enabled: inputEnabled } = input as TListInput & {
      enabled?: boolean
    }
    const resolvedInput = resolveListInput(input, contextRegion)
    const listParams = buildList(resolvedInput)
    const enabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))

    const query = useQuery({
      ...getListQueryOptions(input, {
        queryOptions: options?.queryOptions,
        region: contextRegion,
      }),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    const limitFromParams = (listParams as { limit?: number }).limit
    const offsetFromParams = (listParams as { offset?: number }).offset
    const pagination = resolvePagination(
      {
        page: resolvedInput.page,
        limit: limitFromParams ?? resolvedInput.limit,
        offset: offsetFromParams,
      },
      defaultPageSize
    )

    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      products: data?.products ?? [],
      isLoading,
      isFetching,
      isSuccess,
      error: toErrorMessage(error),
      totalCount,
      currentPage: pagination.page,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      query,
    }
  }

  function useInfiniteProducts(
    input: TListInput & ProductInfiniteInputBase,
    options?: {
      queryOptions?: InfiniteQueryOptions<
        ProductListResponse<TProduct>,
        DefaultError,
        ProductInfiniteData<TProduct>
      >
    }
  ): UseInfiniteProductsResult<TProduct> {
    const contextRegion = useRegionContext()
    const {
      enabled: inputEnabled,
      initialLimit,
      ...baseInput
    } = input as TListInput & {
      enabled?: boolean
      initialLimit?: number
    }
    const resolvedInput = applyRegion(
      baseInput as TListInput,
      contextRegion ?? undefined
    )
    const enabled =
      inputEnabled ?? (!requireRegion || Boolean(resolvedInput.region_id))

    const limitFromInput = (resolvedInput as { limit?: number }).limit
    const resolvedLimit =
      typeof limitFromInput === "number" && limitFromInput > 0
        ? limitFromInput
        : defaultPageSize
    const resolvedInitialLimit =
      typeof initialLimit === "number" && initialLimit > 0
        ? initialLimit
        : undefined
    const initialPageLimit = resolvedInitialLimit ?? resolvedLimit
    const offsetFromInput = (resolvedInput as { offset?: number }).offset
    const pageFromInput = resolvedInput.page ?? 1
    const baseOffset =
      typeof offsetFromInput === "number"
        ? offsetFromInput
        : (pageFromInput - 1) * resolvedLimit

    const baseListParams = buildList(resolvedInput)
    const baseQueryKey = resolvedQueryKeys.infinite
      ? resolvedQueryKeys.infinite(baseListParams)
      : resolvedQueryKeys.list(baseListParams)
    const isInfiniteKey =
      Boolean(resolvedQueryKeys.infinite) ||
      baseQueryKey[baseQueryKey.length - 1] === "__infinite"
    const queryKey = isInfiniteKey
      ? baseQueryKey
      : [...baseQueryKey, "__infinite"]
    const initialLimitKey =
      typeof resolvedInitialLimit === "number"
        ? ["__initialLimit", resolvedInitialLimit]
        : []
    const resolvedQueryKey =
      initialLimitKey.length > 0 ? [...queryKey, ...initialLimitKey] : queryKey

    const query = useInfiniteQuery<
      ProductListResponse<TProduct>,
      DefaultError,
      ProductInfiniteData<TProduct>
    >({
      queryKey: resolvedQueryKey,
      queryFn: ({ pageParam = baseOffset, signal }) => {
        const offset = typeof pageParam === "number" ? pageParam : baseOffset
        const limitForPage =
          offset === baseOffset ? initialPageLimit : resolvedLimit
        const page =
          limitForPage > 0 ? Math.floor(offset / limitForPage) + 1 : 1
        const pageInput = {
          ...resolvedInput,
          page,
          limit: limitForPage,
          offset,
        } as TListInput & { offset?: number }
        const listParams = buildList(pageInput)
        return service.getProducts(listParams, signal)
      },
      initialPageParam: baseOffset,
      getNextPageParam: (lastPage) => {
        const limit = lastPage.limit ?? resolvedLimit
        const offset = lastPage.offset ?? 0
        const moreItemsExist = lastPage.count > offset + limit
        return moreItemsExist ? offset + limit : undefined
      },
      enabled,
      ...resolvedCacheConfig.semiStatic,
      ...(options?.queryOptions ?? {}),
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
      products: data?.pages.flatMap((page) => page.products) ?? [],
      isLoading,
      isFetching,
      isFetchingNextPage,
      hasNextPage: Boolean(hasNextPage),
      error: toErrorMessage(error),
      totalCount: data?.pages[0]?.count ?? 0,
      isSuccess,
      fetchNextPage: () => fetchNextPage(),
      refetch: () => refetch(),
      query,
    }
  }

  function useSuspenseProducts(
    input: SuspenseInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListResponse<TProduct>>
    }
  ): UseSuspenseProductsResult<TProduct> {
    const contextRegion = useRegionContext()
    const resolvedInput = resolveListInput(input as TListInput, contextRegion)

    if (requireRegion && !resolvedInput.region_id) {
      throw new Error("Region is required for product queries")
    }

    const listParams = buildList(resolvedInput)
    const query = useSuspenseQuery(
      getListQueryOptions(input as TListInput, {
        queryOptions: options?.queryOptions,
        region: contextRegion,
      })
    )
    const { data, isFetching } = query

    const limitFromParams = (listParams as { limit?: number }).limit
    const offsetFromParams = (listParams as { offset?: number }).offset
    const pagination = resolvePagination(
      {
        page: resolvedInput.page,
        limit: limitFromParams ?? resolvedInput.limit,
        offset: offsetFromParams,
      },
      defaultPageSize
    )

    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

    return {
      products: data?.products ?? [],
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      totalCount,
      currentPage: pagination.page,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      query,
    }
  }

  function useProduct(
    input: TDetailInput,
    options?: { queryOptions?: ReadQueryOptions<TProduct | null> }
  ): UseProductResult<TProduct> {
    const contextRegion = useRegionContext()
    const { enabled: inputEnabled } = input as TDetailInput & {
      enabled?: boolean
    }
    const resolvedInput = resolveDetailInput(input, contextRegion)
    const enabled =
      inputEnabled ??
      (Boolean(resolvedInput.handle) &&
        (!requireRegion || Boolean(resolvedInput.region_id)))

    const query = useQuery({
      ...getDetailQueryOptions(input, {
        queryOptions: options?.queryOptions,
        region: contextRegion,
      }),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      product: data ?? null,
      isLoading,
      isFetching,
      isSuccess,
      error: toErrorMessage(error),
      query,
    }
  }

  function useSuspenseProduct(
    input: SuspenseInput<TDetailInput>,
    options?: { queryOptions?: SuspenseQueryOptions<TProduct | null> }
  ): UseSuspenseProductResult<TProduct> {
    const contextRegion = useRegionContext()
    const resolvedInput = resolveDetailInput(
      input as TDetailInput,
      contextRegion
    )

    if (requireRegion && !resolvedInput.region_id) {
      throw new Error("Region is required for product queries")
    }

    if (!resolvedInput.handle) {
      throw new Error("Product handle is required for product queries")
    }

    const query = useSuspenseQuery(
      getDetailQueryOptions(input as TDetailInput, {
        queryOptions: options?.queryOptions,
        region: contextRegion,
      })
    )
    const { data, isFetching } = query

    return {
      product: data ?? null,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function usePrefetchProducts(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 800
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"

    const prefetchProducts = async (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(
        baseInput as TListInput,
        contextRegion ?? undefined
      )
      if (requireRegion && !resolvedInput.region_id) {
        return
      }
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher && service.getProductsGlobal
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved
      )

      if (
        shouldSkipPrefetch({
          queryClient,
          queryKey: createProductsListPrefetchQueryOptions(input, {
            cacheStrategy: cacheStrategyResolved,
            region: contextRegion,
            useGlobalFetcher: Boolean(useGlobalFetcher),
          }).queryKey,
          cacheOptions: prefetchCacheOptions,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(
        createProductsListPrefetchQueryOptions(input, {
          cacheStrategy: cacheStrategyResolved,
          prefetchedBy: prefetchOptions?.prefetchedBy,
          region: contextRegion,
          useGlobalFetcher: Boolean(useGlobalFetcher),
        })
      )
    }

    const prefetchFirstPage = async (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(
        baseInput as TListInput,
        contextRegion ?? undefined
      )
      if (requireRegion && !resolvedInput.region_id) {
        return
      }
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher && service.getProductsGlobal
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved
      )

      if (
        shouldSkipPrefetch({
          queryClient,
          queryKey: createProductsFirstPagePrefetchQueryOptions(input, {
            cacheStrategy: cacheStrategyResolved,
            region: contextRegion,
            useGlobalFetcher: Boolean(useGlobalFetcher),
          }).queryKey,
          cacheOptions: prefetchCacheOptions,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(
        createProductsFirstPagePrefetchQueryOptions(input, {
          cacheStrategy: cacheStrategyResolved,
          prefetchedBy: prefetchOptions?.prefetchedBy,
          region: contextRegion,
          useGlobalFetcher: Boolean(useGlobalFetcher),
        })
      )
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(
        baseInput as TListInput,
        contextRegion ?? undefined
      )
      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(
        () => {
          void prefetchProducts(input)
        },
        id,
        delay
      )
    }

    return {
      prefetchProducts,
      prefetchFirstPage,
      delayedPrefetch,
      cancelPrefetch,
    }
  }

  function usePrefetchProduct(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
    skipMode?: PrefetchSkipMode
  }) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 400
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"

    const prefetchProduct = async (
      input: TDetailInput,
      prefetchOptions?: PrefetchProductOptions
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(
        baseInput as TDetailInput,
        contextRegion ?? undefined
      )
      if (requireRegion && !resolvedInput.region_id) {
        return
      }
      if (!resolvedInput.handle) {
        return
      }
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved
      )

      if (
        shouldSkipPrefetch({
          queryClient,
          queryKey: createProductPrefetchQueryOptions(input, {
            cacheStrategy: cacheStrategyResolved,
            region: contextRegion,
          }).queryKey,
          cacheOptions: prefetchCacheOptions,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(
        createProductPrefetchQueryOptions(input, {
          cacheStrategy: cacheStrategyResolved,
          prefetchedBy: prefetchOptions?.prefetchedBy,
          region: contextRegion,
        })
      )
    }

    const delayedPrefetch = (
      input: TDetailInput,
      delay = defaultDelay,
      prefetchId?: string
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(
        baseInput as TDetailInput,
        contextRegion ?? undefined
      )
      const detailParams = buildDetail(resolvedInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(
        () => {
          void prefetchProduct(input)
        },
        id,
        delay
      )
    }

    return {
      prefetchProduct,
      delayedPrefetch,
      cancelPrefetch,
    }
  }

  function usePrefetchPages(params: UsePrefetchPagesParams<TListInput>) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const { enabled: _inputEnabled, ...baseInput } =
      params.baseInput as TListInput & {
        enabled?: boolean
      }
    const resolvedBaseInput = useMemo(
      () => applyRegion(baseInput as TListInput, contextRegion ?? undefined),
      [params.baseInput, contextRegion]
    )

    useEffect(() => {
      if (params.enabled === false || params.shouldPrefetch === false) {
        return
      }

      if (requireRegion && !resolvedBaseInput.region_id) {
        return
      }

      const cacheStrategy = params.cacheStrategy ?? "semiStatic"
      const mode = params.mode ?? "priority"
      const mediumDelay = params.delays?.medium ?? 500
      const lowDelay = params.delays?.low ?? 1500
      const timers: ReturnType<typeof setTimeout>[] = []

      const prefetchPage = (page: number) => {
        const inputWithPage = {
          ...resolvedBaseInput,
          page,
          limit: params.pageSize,
        } as TListInput

        return queryClient.prefetchQuery(
          createProductsListPrefetchQueryOptions(inputWithPage, {
            cacheStrategy,
          })
        )
      }

      const plan = createPrefetchPagesPlan({
        mode,
        currentPage: params.currentPage,
        totalPages: params.totalPages,
        hasNextPage: params.hasNextPage,
        hasPrevPage: params.hasPrevPage,
      })

      for (const page of plan.immediate) {
        prefetchPage(page)
      }

      if (plan.medium.length > 0) {
        timers.push(
          setTimeout(() => {
            for (const page of plan.medium) {
              prefetchPage(page)
            }
          }, mediumDelay)
        )
      }

      if (plan.low.length > 0) {
        timers.push(
          setTimeout(() => {
            for (const page of plan.low) {
              prefetchPage(page)
            }
          }, lowDelay)
        )
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
    getListQueryOptions,
    getDetailQueryOptions,
    useProducts,
    useInfiniteProducts,
    useSuspenseProducts,
    useProduct,
    useSuspenseProduct,
    usePrefetchProducts,
    usePrefetchProduct,
    usePrefetchPages,
  }
}
