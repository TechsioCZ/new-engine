import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { omitUndefined, toPlainRecord } from "@techsio/std/object"

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
import { resolvePagination } from "../shared/pagination"
import type { PrefetchSkipMode } from "../shared/prefetch"
import { shouldSkipPrefetch } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import { useDelayedPrefetchController } from "../shared/use-delayed-prefetch-controller"
import { createDefaultListParams } from "./input-utils"
import { createProductReviewQueryKeys } from "./query-keys"
import { createProductReviewQueryOptionsFactory } from "./query-options"
import type {
  CreateProductReviewInput,
  ProductReviewListInputBase,
  ProductReviewListResponse,
  ProductReviewMutationOptions,
  ProductReviewQueryKeys,
  ProductReviewService,
  ReviewSummary,
  UseCreateProductReviewResult,
  UseProductReviewsResult,
  UseSuspenseProductReviewsResult,
} from "./types"

interface ProductReviewPrefetchHookOptions {
  cacheStrategy?: CacheStrategy
  defaultDelay?: number
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export interface CreateProductReviewHooksConfig<
  TReview,
  TListInput extends ProductReviewListInputBase,
  TListParams,
  TCreateInput extends CreateProductReviewInput = CreateProductReviewInput,
> {
  service: ProductReviewService<TReview, TListParams, TCreateInput>
  buildListParams?: (input: TListInput) => TListParams
  queryKeys?: ProductReviewQueryKeys<TListParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
}

const emptySummary: ReviewSummary = {
  average_rating: 0,
  count: 0,
}

export const createProductReviewHooks = <
  TReview,
  TListInput extends ProductReviewListInputBase & TListParams,
  TListParams,
  TCreateInput extends CreateProductReviewInput = CreateProductReviewInput,
>({
  service,
  buildListParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
}: CreateProductReviewHooksConfig<
  TReview,
  TListInput,
  TListParams,
  TCreateInput
>) => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createProductReviewQueryKeys<TListParams>(queryKeyNamespace)
  const buildList =
    buildListParams ??
    ((input: TListInput) => createDefaultListParams(input, defaultPageSize))
  const { getProductReviewsQueryOptions } =
    createProductReviewQueryOptionsFactory({
      buildListParams: buildList,
      cacheConfig: resolvedCacheConfig,
      defaultPageSize,
      queryKeys: resolvedQueryKeys,
      service,
    })

  const resolveListState = (
    input: TListInput,
    params: TListParams,
    data?: ProductReviewListResponse<TReview>,
  ) => {
    const paramsRecord = toPlainRecord(params)
    const { limit: rawLimit, offset: rawOffset } = paramsRecord ?? {}
    const limitFromParams = typeof rawLimit === "number" ? rawLimit : undefined
    const offsetFromParams =
      typeof rawOffset === "number" ? rawOffset : undefined
    const pagination = resolvePagination(
      omitUndefined({
        limit: limitFromParams ?? input.limit,
        offset: offsetFromParams,
        page: input.page,
      }),
      defaultPageSize,
    )
    const totalCount = data?.count ?? 0
    const totalPages =
      pagination.limit > 0 ? Math.ceil(totalCount / pagination.limit) : 0

    return {
      currentPage: pagination.page,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
      reviews: data?.reviews ?? [],
      summary: data?.summary ?? emptySummary,
      totalCount,
      totalPages,
    }
  }

  const useProductReviews = (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductReviewListResponse<TReview>>
    },
  ): UseProductReviewsResult<TReview> => {
    const enabled = input.enabled ?? Boolean(input.productId)
    const listParams = buildList(input)
    const query = useQuery({
      ...getProductReviewsQueryOptions(
        input,
        omitUndefined({ queryOptions: options?.queryOptions }),
      ),
      enabled,
    })

    return {
      ...resolveListState(input, listParams, query.data),
      error: toErrorMessage(query.error),
      isFetching: query.isFetching,
      isLoading: query.isLoading,
      isSuccess: query.isSuccess,
      query,
    }
  }

  const useSuspenseProductReviews = (
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductReviewListResponse<TReview>>
    },
  ): UseSuspenseProductReviewsResult<TReview> => {
    const listParams = buildList(input)
    const query = useSuspenseQuery({
      ...getProductReviewsQueryOptions(input),
      ...options?.queryOptions,
    })

    return {
      ...resolveListState(input, listParams, query.data),
      error: null,
      isFetching: query.isFetching,
      isLoading: false,
      isSuccess: true,
      query,
    }
  }

  const usePrefetchProductReviews = (
    options?: ProductReviewPrefetchHookOptions,
  ) => {
    const queryClient = useQueryClient()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 500
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy,
    )

    const prefetchProductReviews = async (input: TListInput) => {
      if (input.productId === undefined || input.productId.length === 0) {
        return
      }

      const listParams = buildList(input)
      const queryKey = resolvedQueryKeys.productList(listParams)

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
          await service.listProductReviews(listParams, signal),
        queryKey,
        ...prefetchCacheOptions,
      })
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const listParams = buildList(input)
      const queryKey = resolvedQueryKeys.productList(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(
        async () => {
          await prefetchProductReviews(input)
        },
        id,
        delay,
      )
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchProductReviews,
    }
  }

  const useCreateProductReview = <TContext = unknown>(
    options?: ProductReviewMutationOptions<TReview, TCreateInput, TContext>,
  ): UseCreateProductReviewResult<TReview, TCreateInput, TContext> => {
    const queryClient = useQueryClient()

    return useMutation<TReview, unknown, TCreateInput, TContext>({
      mutationFn: service.createProductReview,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      ...(options?.onError ? { onError: options.onError } : {}),
      onSuccess: async (data, variables, context) => {
        await queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        if (options?.onSuccess !== undefined) {
          options.onSuccess(data, variables, context)
        }
      },
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  return {
    getProductReviewsQueryOptions,
    useCreateProductReview,
    usePrefetchProductReviews,
    useProductReviews,
    useSuspenseProductReviews,
  }
}

export type ProductReviewHooks<
  TReview,
  TListInput extends ProductReviewListInputBase & TListParams,
  TListParams,
  TCreateInput extends CreateProductReviewInput = CreateProductReviewInput,
> = ReturnType<
  typeof createProductReviewHooks<
    TReview,
    TListInput,
    TListParams,
    TCreateInput
  >
>
