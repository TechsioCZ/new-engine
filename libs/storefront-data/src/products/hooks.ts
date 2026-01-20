import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useEffect, useRef } from "react"
import { createCacheConfig, type CacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import { createProductQueryKeys } from "./query-keys"
import { resolvePagination } from "./pagination"
import type {
  ProductDetailInputBase,
  ProductInfiniteInputBase,
  ProductListInputBase,
  ProductQueryKeys,
  ProductService,
  RegionInfo,
  UseInfiniteProductsResult,
  UseProductsResult,
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
  resolveRegion?: () => RegionInfo | null
  resolveRegionSuspense?: () => RegionInfo
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
  resolveRegion,
  resolveRegionSuspense,
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

  function useProducts(input: TListInput): UseProductsResult<TProduct> {
    const region = resolveRegion ? resolveRegion() : null
    const resolvedInput = applyRegion(input, region ?? undefined)
    const listParams = buildList(resolvedInput)
    const queryKey = resolvedQueryKeys.list(listParams)
    const enabled =
      resolvedInput.enabled ??
      (!requireRegion || Boolean(resolvedInput.region_id))

    const { data, isLoading, isFetching, isSuccess, error } = useQuery({
      queryKey,
      queryFn: ({ signal }) => service.getProducts(listParams, signal),
      enabled,
      ...resolvedCacheConfig.semiStatic,
    })

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
    }
  }

  function useInfiniteProducts(
    input: TListInput & ProductInfiniteInputBase
  ): UseInfiniteProductsResult<TProduct> {
    const region = resolveRegion ? resolveRegion() : null
    const baseInput = { ...input } as TListInput & { enabled?: boolean }
    delete baseInput.enabled
    const resolvedInput = applyRegion(baseInput, region ?? undefined)
    const enabled =
      input.enabled ?? (!requireRegion || Boolean(resolvedInput.region_id))

    const limitFromInput = (resolvedInput as { limit?: number }).limit
    const resolvedLimit =
      typeof limitFromInput === "number" && limitFromInput > 0
        ? limitFromInput
        : defaultPageSize
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

    const {
      data,
      isLoading,
      isFetching,
      isFetchingNextPage,
      hasNextPage,
      fetchNextPage,
      refetch,
      error,
    } = useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = baseOffset, signal }) => {
        const offset =
          typeof pageParam === "number" ? pageParam : baseOffset
        const page =
          resolvedLimit > 0 ? Math.floor(offset / resolvedLimit) + 1 : 1
        const pageInput = {
          ...resolvedInput,
          page,
          limit: resolvedLimit,
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
    })

    return {
      products: data?.pages.flatMap((page) => page.products) ?? [],
      isLoading,
      isFetching,
      isFetchingNextPage,
      hasNextPage: Boolean(hasNextPage),
      error:
        error instanceof Error ? error.message : error ? String(error) : null,
      totalCount: data?.pages[0]?.count ?? 0,
      fetchNextPage: () => {
        void fetchNextPage()
      },
      refetch: () => {
        void refetch()
      },
    }
  }

  function useSuspenseProducts(
    input: TListInput
  ): UseSuspenseProductsResult<TProduct> {
    const region = resolveRegionSuspense
      ? resolveRegionSuspense()
      : resolveRegion?.()
    const resolvedInput = applyRegion(input, region ?? undefined)

    if (requireRegion && !resolvedInput.region_id) {
      throw new Error("Region is required for product queries")
    }

    const listParams = buildList(resolvedInput)
    const { data, isFetching } = useSuspenseQuery({
      queryKey: resolvedQueryKeys.list(listParams),
      queryFn: ({ signal }) => service.getProducts(listParams, signal),
      ...resolvedCacheConfig.semiStatic,
    })

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
      isFetching,
      totalCount,
      currentPage: pagination.page,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    }
  }

  function useProduct(input: TDetailInput) {
    const region = resolveRegion ? resolveRegion() : null
    const resolvedInput = applyRegion(input, region ?? undefined)
    const detailParams = buildDetail(resolvedInput)
    const queryKey = resolvedQueryKeys.detail(detailParams)
    const enabled =
      resolvedInput.enabled ??
      (Boolean(resolvedInput.handle) &&
        (!requireRegion || Boolean(resolvedInput.region_id)))

    return useQuery({
      queryKey,
      queryFn: () => service.getProductByHandle(detailParams),
      enabled,
      ...resolvedCacheConfig.semiStatic,
    })
  }

  function useSuspenseProduct(input: TDetailInput) {
    const region = resolveRegionSuspense
      ? resolveRegionSuspense()
      : resolveRegion?.()
    const resolvedInput = applyRegion(input, region ?? undefined)

    if (requireRegion && !resolvedInput.region_id) {
      throw new Error("Region is required for product queries")
    }

    if (!resolvedInput.handle) {
      throw new Error("Product handle is required for product queries")
    }

    const detailParams = buildDetail(resolvedInput)

    return useSuspenseQuery({
      queryKey: resolvedQueryKeys.detail(detailParams),
      queryFn: () => service.getProductByHandle(detailParams),
      ...resolvedCacheConfig.semiStatic,
    })
  }

  function usePrefetchProducts(options?: {
    cacheStrategy?: CacheStrategy
    defaultDelay?: number
    skipIfCached?: boolean
  }) {
    const queryClient = useQueryClient()
    const region = resolveRegion ? resolveRegion() : null
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
    )
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 800
    const skipIfCached = options?.skipIfCached ?? true

    const prefetchProducts = async (
      input: TListInput,
      prefetchOptions?: PrefetchListOptions
    ) => {
      const resolvedInput = applyRegion(input, region ?? undefined)
      if (requireRegion && !resolvedInput.region_id) {
        return
      }

      const listParams = buildList(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const cached = queryClient.getQueryData(queryKey)
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher && service.getProductsGlobal

      if (skipIfCached && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          useGlobalFetcher
            ? service.getProductsGlobal?.(listParams) ??
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
      const resolvedInput = applyRegion(input, region ?? undefined)
      if (requireRegion && !resolvedInput.region_id) {
        return
      }

      const listParams = buildPrefetch(resolvedInput)
      const queryKey = resolvedQueryKeys.list(listParams)
      const cached = queryClient.getQueryData(queryKey)
      const useGlobalFetcher =
        prefetchOptions?.useGlobalFetcher && service.getProductsGlobal

      if (skipIfCached && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) =>
          useGlobalFetcher
            ? service.getProductsGlobal?.(listParams) ??
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
      const resolvedInput = applyRegion(input, region ?? undefined)
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
    const region = resolveRegion ? resolveRegion() : null
    const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
      new Map()
    )
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 400
    const skipIfCached = options?.skipIfCached ?? true

    const prefetchProduct = async (
      input: TDetailInput,
      prefetchOptions?: PrefetchProductOptions
    ) => {
      const resolvedInput = applyRegion(input, region ?? undefined)
      if (requireRegion && !resolvedInput.region_id) {
        return
      }
      if (!resolvedInput.handle) {
        return
      }

      const detailParams = buildDetail(resolvedInput)
      const queryKey = resolvedQueryKeys.detail(detailParams)
      const cached = queryClient.getQueryData(queryKey)

      if (skipIfCached && cached) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => service.getProductByHandle(detailParams),
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
      const resolvedInput = applyRegion(input, region ?? undefined)
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
    // Call resolveRegion outside useEffect to follow Rules of Hooks
    const region = resolveRegion ? resolveRegion() : null
    const resolvedBaseInput = applyRegion(params.baseInput, region ?? undefined)

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
