import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useEffect, useMemo, useRef } from "react"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { DefaultError } from "@tanstack/react-query"
import type {
  InfiniteQueryOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { QueryNamespace } from "../shared/query-keys"
import { useRegionContext } from "../shared/region-context"
import { createProductQueryKeys } from "./query-keys"
import { resolvePagination } from "./pagination"
import type {
  ProductDetailInputBase,
  ProductInfiniteInputBase,
  ProductListInputBase,
  ProductInfiniteData,
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

export type PrefetchListOptions = {
  cacheStrategy?: CacheStrategy
  prefetchedBy?: string
  useGlobalFetcher?: boolean
  skipIfCached?: boolean
}

export type PrefetchProductOptions = {
  cacheStrategy?: CacheStrategy
  prefetchedBy?: string
  skipIfCached?: boolean
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

const applyRegion = <T extends RegionInfo>(
  input: T,
  region?: RegionInfo | null
): T => {
  if (!region) {
    return input
  }

  return {
    ...region,
    ...input,
  }
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
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createProductQueryKeys<TListParams, TDetailParams>(queryKeyNamespace)
  const buildList =
    buildListParams ?? ((input: TListInput) => input as unknown as TListParams)
  const buildPrefetch =
    buildPrefetchParams ??
    ((input: TListInput) => buildList(input))
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => input as unknown as TDetailParams)

  function useProducts(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListResponse<TProduct>>
    }
  ): UseProductsResult<TProduct> {
    const contextRegion = useRegionContext()
    const { enabled: inputEnabled, ...baseInput } = input as TListInput & {
      enabled?: boolean
    }
    const resolvedInput = applyRegion(baseInput as TListInput, contextRegion ?? undefined)
    const listParams = buildList(resolvedInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled =
      inputEnabled ??
      (!requireRegion || Boolean(resolvedInput.region_id))

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getProducts(listParams, signal),
      enabled,
      ...resolvedCacheConfig.semiStatic,
      ...(options?.queryOptions ?? {}),
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
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
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
    const { enabled: inputEnabled, initialLimit, ...baseInput } =
      input as TListInput & {
        enabled?: boolean
        initialLimit?: number
      }
    const resolvedInput = applyRegion(baseInput as TListInput, contextRegion ?? undefined)
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
    const queryKey =
      resolvedQueryKeys.infinite ||
      baseQueryKey[baseQueryKey.length - 1] === "__infinite"
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
        const offset =
          typeof pageParam === "number" ? pageParam : baseOffset
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
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      totalCount: data?.pages[0]?.count ?? 0,
      isSuccess,
      fetchNextPage: () => fetchNextPage(),
      refetch: () => refetch(),
      query,
    }
  }

  function useSuspenseProducts(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListResponse<TProduct>>
    }
  ): UseSuspenseProductsResult<TProduct> {
    const contextRegion = useRegionContext()
    const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
      enabled?: boolean
    }
    const resolvedInput = applyRegion(baseInput as TListInput, contextRegion ?? undefined)

    if (requireRegion && !resolvedInput.region_id) {
      throw new Error("Region is required for product queries")
    }

    const listParams = buildList(resolvedInput)
    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getProducts(listParams, signal),
      ...resolvedCacheConfig.semiStatic,
      ...(options?.queryOptions ?? {}),
    })
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
    const { enabled: inputEnabled, ...baseInput } = input as TDetailInput & {
      enabled?: boolean
    }
    const resolvedInput = applyRegion(baseInput as TDetailInput, contextRegion ?? undefined)
    const detailParams = buildDetail(resolvedInput)
    const queryKey = resolvedQueryKeys.detail(detailParams)
    const enabled =
      inputEnabled ??
      (Boolean(resolvedInput.handle) &&
        (!requireRegion || Boolean(resolvedInput.region_id)))

    const query = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getProductByHandle(detailParams, signal),
      enabled,
      ...resolvedCacheConfig.semiStatic,
      ...(options?.queryOptions ?? {}),
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      product: data ?? null,
      isLoading,
      isFetching,
      isSuccess,
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      query,
    }
  }

  function useSuspenseProduct(
    input: TDetailInput,
    options?: { queryOptions?: SuspenseQueryOptions<TProduct | null> }
  ): UseSuspenseProductResult<TProduct> {
    const contextRegion = useRegionContext()
    const { enabled: _inputEnabled, ...baseInput } = input as TDetailInput & {
      enabled?: boolean
    }
    const resolvedInput = applyRegion(baseInput as TDetailInput, contextRegion ?? undefined)

    if (requireRegion && !resolvedInput.region_id) {
      throw new Error("Region is required for product queries")
    }

    if (!resolvedInput.handle) {
      throw new Error("Product handle is required for product queries")
    }

    const detailParams = buildDetail(resolvedInput)

    const query = useSuspenseQuery({
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: ({ signal }) => service.getProductByHandle(detailParams, signal),
      ...resolvedCacheConfig.semiStatic,
      ...(options?.queryOptions ?? {}),
    })
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
  }) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
    )
    useEffect(() => {
      return () => {
        for (const timeout of timeoutsRef.current.values()) {
          clearTimeout(timeout)
        }
        timeoutsRef.current.clear()
      }
    }, [])
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 800
    const skipIfCached = options?.skipIfCached ?? true

    const prefetchProducts = async (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(baseInput as TListInput, contextRegion ?? undefined)
      if (requireRegion && !resolvedInput.region_id) {
        return
      }

      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const cached = queryClient.getQueryData(queryKey)
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher && service.getProductsGlobal
      const skipIfCachedResolved =
        prefetchOptions?.skipIfCached ?? skipIfCached

      if (skipIfCachedResolved && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          useGlobalFetcher
            ? service.getProductsGlobal?.(listParams, signal) ??
              service.getProducts(listParams, signal)
            : service.getProducts(listParams, signal),
        ...resolvedCacheConfig[prefetchOptions?.cacheStrategy ?? cacheStrategy],
        meta: prefetchOptions?.prefetchedBy
          ? { prefetchedBy: prefetchOptions.prefetchedBy }
          : undefined,
      })
    }

    const prefetchFirstPage = async (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(baseInput as TListInput, contextRegion ?? undefined)
      if (requireRegion && !resolvedInput.region_id) {
        return
      }

      const listParams = buildPrefetch(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const cached = queryClient.getQueryData(queryKey)
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher && service.getProductsGlobal
      const skipIfCachedResolved =
        prefetchOptions?.skipIfCached ?? skipIfCached

      if (skipIfCachedResolved && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          useGlobalFetcher
            ? service.getProductsGlobal?.(listParams, signal) ??
              service.getProducts(listParams, signal)
            : service.getProducts(listParams, signal),
        ...resolvedCacheConfig[prefetchOptions?.cacheStrategy ?? cacheStrategy],
        meta: prefetchOptions?.prefetchedBy
          ? { prefetchedBy: prefetchOptions.prefetchedBy }
          : undefined,
      })
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TListInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(baseInput as TListInput, contextRegion ?? undefined)
      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      const existing = timeoutsRef.current.get(id)
      if (existing) {
        clearTimeout(existing)
      }

      const timeoutId = setTimeout(() => {
        prefetchProducts(input)
        timeoutsRef.current.delete(id)
      }, delay)

      timeoutsRef.current.set(id, timeoutId)
      return id
    }

    const cancelPrefetch = (prefetchId: string) => {
      const timeout = timeoutsRef.current.get(prefetchId)
      if (timeout) {
        clearTimeout(timeout)
        timeoutsRef.current.delete(prefetchId)
      }
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
  }) {
    const queryClient = useQueryClient()
    const contextRegion = useRegionContext()
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
    )
    useEffect(() => {
      return () => {
        for (const timeout of timeoutsRef.current.values()) {
          clearTimeout(timeout)
        }
        timeoutsRef.current.clear()
      }
    }, [])
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 400
    const skipIfCached = options?.skipIfCached ?? true

    const prefetchProduct = async (
      input: TDetailInput,
      prefetchOptions?: PrefetchProductOptions
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(baseInput as TDetailInput, contextRegion ?? undefined)
      if (requireRegion && !resolvedInput.region_id) {
        return
      }
      if (!resolvedInput.handle) {
        return
      }

      const detailParams = buildDetail(resolvedInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const cached = queryClient.getQueryData(queryKey)
      const skipIfCachedResolved =
        prefetchOptions?.skipIfCached ?? skipIfCached

      if (skipIfCachedResolved && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          service.getProductByHandle(detailParams, signal),
        ...resolvedCacheConfig[prefetchOptions?.cacheStrategy ?? cacheStrategy],
        meta: prefetchOptions?.prefetchedBy
          ? { prefetchedBy: prefetchOptions.prefetchedBy }
          : undefined,
      })
    }

    const delayedPrefetch = (
      input: TDetailInput,
      delay = defaultDelay,
      prefetchId?: string
    ) => {
      const { enabled: _inputEnabled, ...baseInput } = input as TDetailInput & {
        enabled?: boolean
      }
      const resolvedInput = applyRegion(baseInput as TDetailInput, contextRegion ?? undefined)
      const detailParams = buildDetail(resolvedInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      const existing = timeoutsRef.current.get(id)
      if (existing) {
        clearTimeout(existing)
      }

      const timeoutId = setTimeout(() => {
        prefetchProduct(input)
        timeoutsRef.current.delete(id)
      }, delay)

      timeoutsRef.current.set(id, timeoutId)
      return id
    }

    const cancelPrefetch = (prefetchId: string) => {
      const timeout = timeoutsRef.current.get(prefetchId)
      if (timeout) {
        clearTimeout(timeout)
        timeoutsRef.current.delete(prefetchId)
      }
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

        const listParams = buildList(inputWithPage)

        return queryClient.prefetchQuery({
          queryKey: resolvedQueryKeys.list(listParams),
          queryFn: ({ signal }) => service.getProducts(listParams, signal),
          ...resolvedCacheConfig[cacheStrategy],
        })
      }

      if (mode === "simple") {
        const pagesToPrefetch: number[] = []

        if (params.currentPage !== 1) {
          pagesToPrefetch.push(1)
        }

        if (params.hasPrevPage) {
          pagesToPrefetch.push(params.currentPage - 1)
          if (params.currentPage - 2 >= 1) {
            pagesToPrefetch.push(params.currentPage - 2)
          }
        }

        if (params.hasNextPage) {
          pagesToPrefetch.push(params.currentPage + 1)
          if (params.currentPage + 2 <= params.totalPages) {
            pagesToPrefetch.push(params.currentPage + 2)
          }
        }

        if (
          params.totalPages > 1 &&
          params.currentPage !== params.totalPages
        ) {
          pagesToPrefetch.push(params.totalPages)
        }

        for (const page of pagesToPrefetch) {
          prefetchPage(page)
        }

        return
      }

      const high = params.hasNextPage ? [params.currentPage + 1] : []
      const medium =
        params.hasNextPage && params.currentPage + 2 <= params.totalPages
          ? [params.currentPage + 2]
          : []
      const lowCandidates = [
        params.hasPrevPage ? params.currentPage - 1 : null,
        params.currentPage !== 1 ? 1 : null,
        params.totalPages > 1 && params.currentPage !== params.totalPages
          ? params.totalPages
          : null,
      ].filter((page): page is number => page !== null)
      const low = Array.from(new Set(lowCandidates))

      for (const page of high) {
        prefetchPage(page)
      }

      if (medium.length > 0) {
        timers.push(
          setTimeout(() => {
            for (const page of medium) {
              prefetchPage(page)
            }
          }, mediumDelay)
        )
      }

      if (low.length > 0) {
        timers.push(
          setTimeout(() => {
            for (const page of low) {
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
