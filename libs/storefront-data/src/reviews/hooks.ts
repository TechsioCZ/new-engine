import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import {
  type CacheConfig,
  type CacheStrategy,
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { PrefetchSkipMode } from "../shared/prefetch"
import { shouldSkipPrefetch } from "../shared/prefetch"
import { resolvePagination } from "../shared/pagination"
import type { QueryNamespace } from "../shared/query-keys"
import { useDelayedPrefetchController } from "../shared/use-delayed-prefetch-controller"
import { createDefaultListParams } from "./input-utils"
import { createProductReviewQueryOptionsFactory } from "./query-options"
import { createProductReviewQueryKeys } from "./query-keys"
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

type ProductReviewPrefetchHookOptions = {
  cacheStrategy?: CacheStrategy
  defaultDelay?: number
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export type CreateProductReviewHooksConfig<
  TReview,
  TListInput extends ProductReviewListInputBase,
  TListParams,
  TCreateInput extends CreateProductReviewInput = CreateProductReviewInput,
> = {
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

export function createProductReviewHooks<
  TReview,
  TListInput extends ProductReviewListInputBase,
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
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createProductReviewQueryKeys<TListParams>(queryKeyNamespace)
  const buildList =
    buildListParams ??
    ((input: TListInput) =>
      createDefaultListParams(input, defaultPageSize) as TListParams)
  const { getProductReviewsQueryOptions } =
    createProductReviewQueryOptionsFactory({
      service,
      buildListParams: buildList,
      queryKeys: resolvedQueryKeys,
      cacheConfig: resolvedCacheConfig,
      defaultPageSize,
    })

  const resolveListState = (
    input: TListInput,
    params: TListParams,
    data?: ProductReviewListResponse<TReview>
  ) => {
    const limitFromParams = (params as { limit?: number }).limit
    const offsetFromParams = (params as { offset?: number }).offset
    const pagination = resolvePagination(
      {
        page: input.page,
        limit: limitFromParams ?? input.limit,
        offset: offsetFromParams,
      },
      defaultPageSize
    )
    const totalCount = data?.count ?? 0
    const totalPages = pagination.limit
      ? Math.ceil(totalCount / pagination.limit)
      : 0

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

  function useProductReviews(
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductReviewListResponse<TReview>>
    }
  ): UseProductReviewsResult<TReview> {
    const enabled = input.enabled ?? Boolean(input.productId)
    const listParams = buildList(input)
    const query = useQuery({
      ...getProductReviewsQueryOptions(input, {
        queryOptions: options?.queryOptions,
      }),
      enabled,
    })

    return {
      ...resolveListState(input, listParams, query.data),
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      isSuccess: query.isSuccess,
      error: toErrorMessage(query.error),
      query,
    }
  }

  function useSuspenseProductReviews(
    input: TListInput,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductReviewListResponse<TReview>>
    }
  ): UseSuspenseProductReviewsResult<TReview> {
    const listParams = buildList(input)
    const query = useSuspenseQuery({
      ...getProductReviewsQueryOptions(input, {
        queryOptions: options?.queryOptions as ReadQueryOptions<
          ProductReviewListResponse<TReview>
        >,
      }),
    })

    return {
      ...resolveListState(input, listParams, query.data),
      isLoading: false,
      isFetching: query.isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function usePrefetchProductReviews(
    options?: ProductReviewPrefetchHookOptions
  ) {
    const queryClient = useQueryClient()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "semiStatic"
    const defaultDelay = options?.defaultDelay ?? 500
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      cacheStrategy
    )

    const prefetchProductReviews = async (input: TListInput) => {
      if (!input.productId) {
        return
      }

      const listParams = buildList(input)
      const queryKey = resolvedQueryKeys.productList(listParams)

      if (
        shouldSkipPrefetch({
          queryClient,
          queryKey,
          cacheOptions: prefetchCacheOptions,
          skipIfCached,
          skipMode,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery({
        queryKey,
        queryFn: ({ signal }) => service.listProductReviews(listParams, signal),
        ...prefetchCacheOptions,
      })
    }

    const delayedPrefetch = (
      input: TListInput,
      delay = defaultDelay,
      prefetchId?: string
    ) => {
      const listParams = buildList(input)
      const queryKey = resolvedQueryKeys.productList(listParams)
      const id = prefetchId ?? JSON.stringify(queryKey)
      return schedulePrefetch(
        () => prefetchProductReviews(input),
        id,
        delay
      )
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchProductReviews,
    }
  }

  function useCreateProductReview<TContext = unknown>(
    options?: ProductReviewMutationOptions<TReview, TCreateInput, TContext>
  ): UseCreateProductReviewResult<TReview, TCreateInput, TContext> {
    const queryClient = useQueryClient()

    return useMutation<TReview, unknown, TCreateInput, TContext>({
      mutationFn: service.createProductReview,
      onMutate: options?.onMutate,
      onError: options?.onError,
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({
          queryKey: resolvedQueryKeys.all(),
        })
        options?.onSuccess?.(data, variables, context)
      },
      onSettled: options?.onSettled,
    })
  }

  return {
    getProductReviewsQueryOptions,
    useProductReviews,
    useSuspenseProductReviews,
    usePrefetchProductReviews,
    useCreateProductReview,
  }
}

export type ProductReviewHooks<
  TReview,
  TListInput extends ProductReviewListInputBase,
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
