import type { UseMutationResult } from "@tanstack/react-query"
import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { omitUndefined } from "@techsio/std/object"

import type { CartQueryKeys } from "../cart/types"
import {
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import type { CacheConfig, CacheStrategy } from "../shared/cache-config"
import { syncCartCaches } from "../shared/cart-cache-sync"
import type { ActiveCartQueryKeyMatcher } from "../shared/cart-cache-sync"
import { toErrorMessage } from "../shared/error-utils"
import type { QueryResult } from "../shared/hook-result-types"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import { shouldSkipPrefetch } from "../shared/prefetch"
import type { PrefetchSkipMode } from "../shared/prefetch"
import type { QueryNamespace } from "../shared/query-keys"
import type { StorageValueStore } from "../shared/storage-value-store"
import { useDelayedPrefetchController } from "../shared/use-delayed-prefetch-controller"
import {
  createDefaultListParams,
  stripDetailInput,
  withCustomerScope,
} from "./input-utils"
import { createProductListQueryKeys } from "./query-keys"
import type {
  AddFavoriteProductListItemInput,
  AddProductListItemInput,
  ChangeProductListItemQuantityInput,
  CreateCustomProductListInput,
  CreateFavoriteProductListInput,
  CreateProductListCartInput,
  DeleteProductListInput,
  DeleteProductListItemInput,
  IncrementProductListItemInput,
  ProductListCartLike,
  ProductListDeleteResponse,
  ProductListDetailInputBase,
  ProductListListInputBase,
  ProductListListResult,
  ProductListMutationOptions,
  ProductListQueryKeys,
  ProductListService,
  UpdateProductListInput,
  UpdateProductListItemInput,
  UseProductListResult,
  UseProductListsResult,
  UseSuspenseProductListResult,
  UseSuspenseProductListsResult,
} from "./types"

type SuspenseListInput<TInput extends ProductListListInputBase> = Omit<
  TInput,
  "enabled"
>
type SuspenseDetailInput<TInput extends ProductListDetailInputBase> = Omit<
  TInput,
  "enabled" | "id"
> & {
  id: NonNullable<TInput["id"]>
}

const hasText = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.length > 0

/**
 * Carries a value across the factory's free type parameters. The caller picks
 * `TListParams`, `TDetailParams`, and the key-param shapes, so the built-in
 * fallback builders cannot prove they produce them. The relationship is
 * declared once here instead of at every call site.
 */
class GenericParameterBridge {
  private readonly passThrough: (value: object) => object

  constructor(passThrough: (value: object) => object) {
    this.passThrough = passThrough
  }

  resolve<TOutput>(value: object, output?: TOutput): TOutput
  resolve(value: object): unknown {
    return this.passThrough(value)
  }
}

const genericParameters = new GenericParameterBridge((value) => value)

export interface ProductListPrefetchHookOptions {
  cacheStrategy?: CacheStrategy
  defaultDelay?: number
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export interface ProductListPrefetchOptions {
  cacheStrategy?: CacheStrategy
  prefetchedBy?: string
  skipIfCached?: boolean
  skipMode?: PrefetchSkipMode
}

export interface CreateProductListHooksConfig<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TListParams,
  TDetailInput extends ProductListDetailInputBase,
  TDetailParams,
  TListKeyParams = TListParams & { customerId?: string | null },
  TDetailKeyParams = TDetailParams & { customerId?: string | null },
> {
  service: ProductListService<
    TProductList,
    TProductListItem,
    TCart,
    TListParams,
    TDetailParams
  >
  buildListParams?: (input: TListInput) => TListParams
  buildDetailParams?: (input: TDetailInput) => TDetailParams
  buildListKeyParams?: (
    input: TListInput,
    params: TListParams,
  ) => TListKeyParams
  buildDetailKeyParams?: (
    input: TDetailInput,
    params: TDetailParams,
  ) => TDetailKeyParams
  queryKeys?: ProductListQueryKeys<TListKeyParams, TDetailKeyParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
  cartQueryKeys?: CartQueryKeys
  cartStorage?: StorageValueStore | undefined
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher | undefined
}

export interface ProductListHooks<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TDetailInput extends ProductListDetailInputBase,
> {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    },
  ) => QueryFactoryOptions<ProductListListResult<TProductList>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    },
  ) => QueryFactoryOptions<TProductList | null>
  useProductLists: (
    input?: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    },
  ) => UseProductListsResult<TProductList>
  useSuspenseProductLists: (
    input?: SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListListResult<TProductList>>
    },
  ) => UseSuspenseProductListsResult<TProductList>
  useProductList: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    },
  ) => UseProductListResult<TProductList>
  useSuspenseProductList: (
    input: SuspenseDetailInput<TDetailInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<TProductList | null>
    },
  ) => UseSuspenseProductListResult<TProductList>
  useProductListDetails: (
    inputs: TDetailInput[],
    options?: {
      enabled?: boolean
      queryOptions?: ReadQueryOptions<TProductList | null>
    },
  ) => QueryResult<TProductList | null>[]
  usePrefetchProductLists: (options?: ProductListPrefetchHookOptions) => {
    prefetchProductLists: (
      input?: TListInput,
      prefetchOptions?: ProductListPrefetchOptions,
    ) => Promise<void>
    delayedPrefetch: (
      input?: TListInput,
      delay?: number,
      prefetchId?: string,
    ) => string
    cancelPrefetch: (prefetchId: string) => void
  }
  usePrefetchProductList: (options?: ProductListPrefetchHookOptions) => {
    prefetchProductList: (
      input: TDetailInput,
      prefetchOptions?: ProductListPrefetchOptions,
    ) => Promise<void>
    delayedPrefetch: (
      input: TDetailInput,
      delay?: number,
      prefetchId?: string,
    ) => string
    cancelPrefetch: (prefetchId: string) => void
  }
  useCreateFavoriteProductList: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      CreateFavoriteProductListInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductList | null,
    unknown,
    CreateFavoriteProductListInput,
    TContext
  >
  useCreateCustomProductList: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      CreateCustomProductListInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductList | null,
    unknown,
    CreateCustomProductListInput,
    TContext
  >
  useUpdateProductList: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      UpdateProductListInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductList | null,
    unknown,
    UpdateProductListInput,
    TContext
  >
  useDeleteProductList: <TContext = unknown>(
    options?: ProductListMutationOptions<
      ProductListDeleteResponse,
      DeleteProductListInput,
      TContext
    >,
  ) => UseMutationResult<
    ProductListDeleteResponse,
    unknown,
    DeleteProductListInput,
    TContext
  >
  useAddProductListItem: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      AddProductListItemInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductListItem | null,
    unknown,
    AddProductListItemInput,
    TContext
  >
  useAddFavoriteProductListItem: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      AddFavoriteProductListItemInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductListItem | null,
    unknown,
    AddFavoriteProductListItemInput,
    TContext
  >
  useCreateProductListCart: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TCart,
      CreateProductListCartInput,
      TContext
    >,
  ) => UseMutationResult<TCart, unknown, CreateProductListCartInput, TContext>
  useUpdateProductListItem: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      UpdateProductListItemInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductListItem | null,
    unknown,
    UpdateProductListItemInput,
    TContext
  >
  useChangeProductListItemQuantity: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      ChangeProductListItemQuantityInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductListItem | null,
    unknown,
    ChangeProductListItemQuantityInput,
    TContext
  >
  useIncrementProductListItem: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      IncrementProductListItemInput,
      TContext
    >,
  ) => UseMutationResult<
    TProductListItem | null,
    unknown,
    IncrementProductListItemInput,
    TContext
  >
  useDeleteProductListItem: <TContext = unknown>(
    options?: ProductListMutationOptions<
      ProductListDeleteResponse,
      DeleteProductListItemInput,
      TContext
    >,
  ) => UseMutationResult<
    ProductListDeleteResponse,
    unknown,
    DeleteProductListItemInput,
    TContext
  >
}

export const createProductListHooks = function createProductListHooks<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TListParams = Omit<TListInput, "enabled" | "customerId" | "page">,
  TDetailInput extends ProductListDetailInputBase = ProductListDetailInputBase,
  TDetailParams = Omit<TDetailInput, "enabled" | "customerId">,
  TListKeyParams = TListParams & { customerId?: string | null },
  TDetailKeyParams = TDetailParams & { customerId?: string | null },
>({
  service,
  buildListParams,
  buildDetailParams,
  buildListKeyParams,
  buildDetailKeyParams,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  defaultPageSize = 20,
  cartQueryKeys,
  cartStorage,
  isActiveCartQueryKey,
}: CreateProductListHooksConfig<
  TProductList,
  TProductListItem,
  TCart,
  TListInput,
  TListParams,
  TDetailInput,
  TDetailParams,
  TListKeyParams,
  TDetailKeyParams
>): ProductListHooks<
  TProductList,
  TProductListItem,
  TCart,
  TListInput,
  TDetailInput
> {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ??
    createProductListQueryKeys<TListKeyParams, TDetailKeyParams>(
      queryKeyNamespace,
    )
  const buildList =
    buildListParams ??
    ((input: TListInput) =>
      genericParameters.resolve<TListParams>(
        createDefaultListParams(input, defaultPageSize),
      ))
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) =>
      genericParameters.resolve<TDetailParams>(stripDetailInput(input)))
  const buildListKey =
    buildListKeyParams ??
    ((input: TListInput, params: TListParams) =>
      genericParameters.resolve<TListKeyParams>(
        withCustomerScope(params, input),
      ))
  const buildDetailKey =
    buildDetailKeyParams ??
    ((input: TDetailInput, params: TDetailParams) =>
      genericParameters.resolve<TDetailKeyParams>(
        withCustomerScope(params, input),
      ))

  const getListQueryOptions = (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    },
  ): QueryFactoryOptions<ProductListListResult<TProductList>> => {
    const listParams = buildList(input)

    return omitUndefined({
      queryFn: async ({ signal }: { signal?: AbortSignal }) =>
        await service.listProductLists(listParams, signal),
      queryKey: resolvedQueryKeys.list(buildListKey(input, listParams)),
      ...resolvedCacheConfig.userData,
      ...options?.queryOptions,
    })
  }

  const getDetailQueryOptions = (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    },
  ): QueryFactoryOptions<TProductList | null> => {
    const detailParams = buildDetail(input)

    return omitUndefined({
      queryFn: async ({ signal }: { signal?: AbortSignal }) => {
        if (!hasText(input.id)) {
          throw new Error("Product list id is required")
        }

        return await service.getProductList(detailParams, signal)
      },
      queryKey: resolvedQueryKeys.detail(buildDetailKey(input, detailParams)),
      ...resolvedCacheConfig.userData,
      ...options?.queryOptions,
    })
  }

  const createProductListsPrefetchQueryOptions = (
    input: TListInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
    },
  ) => {
    const listParams = buildList(input)
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "userData",
    )
    const prefetchedBy = options?.prefetchedBy

    return omitUndefined({
      queryFn: async ({ signal }: { signal?: AbortSignal }) =>
        await service.listProductLists(listParams, signal),
      queryKey: resolvedQueryKeys.list(buildListKey(input, listParams)),
      ...prefetchCacheOptions,
      meta: hasText(prefetchedBy) ? { prefetchedBy } : undefined,
    })
  }

  const createProductListPrefetchQueryOptions = (
    input: TDetailInput,
    options?: {
      cacheStrategy?: CacheStrategy
      prefetchedBy?: string
    },
  ) => {
    const detailParams = buildDetail(input)
    const prefetchCacheOptions = getPrefetchCacheOptions(
      resolvedCacheConfig,
      options?.cacheStrategy ?? "userData",
    )
    const prefetchedBy = options?.prefetchedBy

    return omitUndefined({
      queryFn: async ({ signal }: { signal?: AbortSignal }) =>
        await service.getProductList(detailParams, signal),
      queryKey: resolvedQueryKeys.detail(buildDetailKey(input, detailParams)),
      ...prefetchCacheOptions,
      meta: hasText(prefetchedBy) ? { prefetchedBy } : undefined,
    })
  }

  const invalidateProductLists = async (
    queryClient: ReturnType<typeof useQueryClient>,
  ) => {
    await queryClient.invalidateQueries({
      queryKey: resolvedQueryKeys.all(),
    })
  }

  const useProductLists = (
    input = genericParameters.resolve<TListInput>({}),
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    },
  ): UseProductListsResult<TProductList> => {
    const enabled = input.enabled ?? true
    const query = useQuery({
      ...getListQueryOptions(input, options),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      count: data?.count ?? 0,
      error: toErrorMessage(error),
      isFetching,
      isLoading,
      isSuccess,
      limit: data?.limit ?? input.limit ?? defaultPageSize,
      offset: data?.offset ?? input.offset ?? 0,
      productLists: data?.productLists ?? [],
      query,
    }
  }

  const useSuspenseProductLists = (
    input = genericParameters.resolve<SuspenseListInput<TListInput>>({}),
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListListResult<TProductList>>
    },
  ): UseSuspenseProductListsResult<TProductList> => {
    const query = useSuspenseQuery({
      ...getListQueryOptions(genericParameters.resolve<TListInput>(input), {
        queryOptions: genericParameters.resolve<
          ReadQueryOptions<ProductListListResult<TProductList>>
        >(options?.queryOptions ?? {}),
      }),
    })
    const { data, isFetching } = query

    return {
      count: data.count,
      error: null,
      isFetching,
      isLoading: false,
      isSuccess: true,
      limit: data.limit,
      offset: data.offset,
      productLists: data.productLists,
      query,
    }
  }

  const useProductList = (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    },
  ): UseProductListResult<TProductList> => {
    const enabled = Boolean(input.id) && (input.enabled ?? true)
    const query = useQuery({
      ...getDetailQueryOptions(input, options),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      error: toErrorMessage(error),
      isFetching,
      isLoading,
      isSuccess,
      productList: data ?? null,
      query,
    }
  }

  const useSuspenseProductList = (
    input: SuspenseDetailInput<TDetailInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<TProductList | null>
    },
  ): UseSuspenseProductListResult<TProductList> => {
    if (!input.id) {
      throw new Error("Product list id is required")
    }

    const query = useSuspenseQuery({
      ...getDetailQueryOptions(genericParameters.resolve<TDetailInput>(input), {
        queryOptions: genericParameters.resolve<
          ReadQueryOptions<TProductList | null>
        >(options?.queryOptions ?? {}),
      }),
    })
    const { data, isFetching } = query

    return {
      error: null,
      isFetching,
      isLoading: false,
      isSuccess: true,
      productList: data ?? null,
      query,
    }
  }

  const useProductListDetails = (
    inputs: TDetailInput[],
    options?: {
      enabled?: boolean
      queryOptions?: ReadQueryOptions<TProductList | null>
    },
  ): QueryResult<TProductList | null>[] => {
    const enabled = options?.enabled ?? true

    return useQueries({
      queries: inputs.map((input) => ({
        ...getDetailQueryOptions(
          input,
          omitUndefined({ queryOptions: options?.queryOptions }),
        ),
        enabled: enabled && Boolean(input.id),
      })),
    })
  }

  const usePrefetchProductLists = (
    options?: ProductListPrefetchHookOptions,
  ) => {
    const queryClient = useQueryClient()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "userData"
    const defaultDelay = options?.defaultDelay ?? 800
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"

    const prefetchProductLists = async (
      input = genericParameters.resolve<TListInput>({}),
      prefetchOptions?: ProductListPrefetchOptions,
    ) => {
      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const queryOptions = createProductListsPrefetchQueryOptions(
        input,
        omitUndefined({
          cacheStrategy: cacheStrategyResolved,
          prefetchedBy: prefetchOptions?.prefetchedBy,
        }),
      )
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved,
      )

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey: queryOptions.queryKey,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(queryOptions)
    }

    const delayedPrefetch = (
      input = genericParameters.resolve<TListInput>({}),
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const queryOptions = createProductListsPrefetchQueryOptions(
        input,
        omitUndefined({ cacheStrategy }),
      )
      const id = prefetchId ?? JSON.stringify(queryOptions.queryKey)

      return schedulePrefetch(
        async () => {
          await prefetchProductLists(input)
        },
        id,
        delay,
      )
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchProductLists,
    }
  }

  const usePrefetchProductList = (options?: ProductListPrefetchHookOptions) => {
    const queryClient = useQueryClient()
    const { schedulePrefetch, cancelPrefetch } = useDelayedPrefetchController()
    const cacheStrategy = options?.cacheStrategy ?? "userData"
    const defaultDelay = options?.defaultDelay ?? 400
    const skipIfCached = options?.skipIfCached ?? true
    const skipMode = options?.skipMode ?? "fresh"

    const prefetchProductList = async (
      input: TDetailInput,
      prefetchOptions?: ProductListPrefetchOptions,
    ) => {
      if (!hasText(input.id)) {
        return
      }

      const cacheStrategyResolved =
        prefetchOptions?.cacheStrategy ?? cacheStrategy
      const skipIfCachedResolved = prefetchOptions?.skipIfCached ?? skipIfCached
      const skipModeResolved = prefetchOptions?.skipMode ?? skipMode
      const queryOptions = createProductListPrefetchQueryOptions(
        input,
        omitUndefined({
          cacheStrategy: cacheStrategyResolved,
          prefetchedBy: prefetchOptions?.prefetchedBy,
        }),
      )
      const prefetchCacheOptions = getPrefetchCacheOptions(
        resolvedCacheConfig,
        cacheStrategyResolved,
      )

      if (
        shouldSkipPrefetch({
          cacheOptions: prefetchCacheOptions,
          queryClient,
          queryKey: queryOptions.queryKey,
          skipIfCached: skipIfCachedResolved,
          skipMode: skipModeResolved,
        })
      ) {
        return
      }

      await queryClient.prefetchQuery(queryOptions)
    }

    const delayedPrefetch = (
      input: TDetailInput,
      delay = defaultDelay,
      prefetchId?: string,
    ) => {
      const queryOptions = createProductListPrefetchQueryOptions(
        input,
        omitUndefined({ cacheStrategy }),
      )
      const id = prefetchId ?? JSON.stringify(queryOptions.queryKey)

      return schedulePrefetch(
        async () => {
          await prefetchProductList(input)
        },
        id,
        delay,
      )
    }

    return {
      cancelPrefetch,
      delayedPrefetch,
      prefetchProductList,
    }
  }

  const useCreateFavoriteProductList = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      CreateFavoriteProductListInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductList | null,
      unknown,
      CreateFavoriteProductListInput,
      TContext
    >({
      mutationFn: service.createFavoriteProductList,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useCreateCustomProductList = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      CreateCustomProductListInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductList | null,
      unknown,
      CreateCustomProductListInput,
      TContext
    >({
      mutationFn: service.createCustomProductList,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useUpdateProductList = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      UpdateProductListInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductList | null,
      unknown,
      UpdateProductListInput,
      TContext
    >({
      mutationFn: service.updateProductList,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useDeleteProductList = <TContext = unknown>(
    options?: ProductListMutationOptions<
      ProductListDeleteResponse,
      DeleteProductListInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      ProductListDeleteResponse,
      unknown,
      DeleteProductListInput,
      TContext
    >({
      mutationFn: service.deleteProductList,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useAddProductListItem = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      AddProductListItemInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      AddProductListItemInput,
      TContext
    >({
      mutationFn: service.addProductListItem,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useAddFavoriteProductListItem = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      AddFavoriteProductListItemInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      AddFavoriteProductListItemInput,
      TContext
    >({
      mutationFn: service.addFavoriteProductListItem,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useCreateProductListCart = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TCart,
      CreateProductListCartInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<TCart, unknown, CreateProductListCartInput, TContext>({
      mutationFn: service.createProductListCart,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (cart, variables, context) => {
        if (cartQueryKeys) {
          syncCartCaches(queryClient, cartQueryKeys, cart, {
            isActiveCartQueryKey,
          })
          await queryClient.invalidateQueries({
            queryKey: cartQueryKeys.all(),
          })
        }
        cartStorage?.set(cart.id)
        options?.onSuccess?.(cart, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useUpdateProductListItem = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      UpdateProductListItemInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      UpdateProductListItemInput,
      TContext
    >({
      mutationFn: service.updateProductListItem,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useChangeProductListItemQuantity = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      ChangeProductListItemQuantityInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      ChangeProductListItemQuantityInput,
      TContext
    >({
      mutationFn: service.changeProductListItemQuantity,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useIncrementProductListItem = <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      IncrementProductListItemInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      IncrementProductListItemInput,
      TContext
    >({
      mutationFn: service.incrementProductListItem,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  const useDeleteProductListItem = <TContext = unknown>(
    options?: ProductListMutationOptions<
      ProductListDeleteResponse,
      DeleteProductListItemInput,
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()

    return useMutation<
      ProductListDeleteResponse,
      unknown,
      DeleteProductListItemInput,
      TContext
    >({
      mutationFn: service.deleteProductListItem,
      ...(options?.onMutate ? { onMutate: options.onMutate } : {}),
      onSuccess: async (data, variables, context) => {
        await invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      ...(options?.onError ? { onError: options.onError } : {}),
      ...(options?.onSettled ? { onSettled: options.onSettled } : {}),
    })
  }

  return {
    getDetailQueryOptions,
    getListQueryOptions,
    useAddFavoriteProductListItem,
    useAddProductListItem,
    useChangeProductListItemQuantity,
    useCreateCustomProductList,
    useCreateFavoriteProductList,
    useCreateProductListCart,
    useDeleteProductList,
    useDeleteProductListItem,
    useIncrementProductListItem,
    usePrefetchProductList,
    usePrefetchProductLists,
    useProductList,
    useProductListDetails,
    useProductLists,
    useSuspenseProductList,
    useSuspenseProductLists,
    useUpdateProductList,
    useUpdateProductListItem,
  }
}
