import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { UseMutationResult } from "@tanstack/react-query"
import {
  type ActiveCartQueryKeyMatcher,
  syncCartCaches,
} from "../shared/cart-cache-sync"
import {
  type CacheConfig,
  createCacheConfig,
} from "../shared/cache-config"
import { toErrorMessage } from "../shared/error-utils"
import type {
  QueryFactoryOptions,
  ReadQueryOptions,
  SuspenseQueryOptions,
} from "../shared/hook-types"
import type { QueryResult } from "../shared/hook-result-types"
import { resolvePagination } from "../shared/pagination"
import type { QueryNamespace } from "../shared/query-keys"
import type { CartQueryKeys } from "../cart/types"
import type { StorageValueStore } from "../shared/storage-value-store"
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
  "enabled"
>

export type CreateProductListHooksConfig<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TListParams,
  TDetailInput extends ProductListDetailInputBase,
  TDetailParams,
  TListKeyParams = TListParams & { customerId?: string | null },
  TDetailKeyParams = TDetailParams & { customerId?: string | null },
> = {
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
    params: TListParams
  ) => TListKeyParams
  buildDetailKeyParams?: (
    input: TDetailInput,
    params: TDetailParams
  ) => TDetailKeyParams
  queryKeys?: ProductListQueryKeys<TListKeyParams, TDetailKeyParams>
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  defaultPageSize?: number
  cartQueryKeys?: CartQueryKeys
  cartStorage?: StorageValueStore
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher
}

export type ProductListHooks<
  TProductList,
  TProductListItem,
  TCart extends ProductListCartLike,
  TListInput extends ProductListListInputBase,
  TDetailInput extends ProductListDetailInputBase,
> = {
  getListQueryOptions: (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    }
  ) => QueryFactoryOptions<ProductListListResult<TProductList>>
  getDetailQueryOptions: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    }
  ) => QueryFactoryOptions<TProductList | null>
  useProductLists: (
    input?: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    }
  ) => UseProductListsResult<TProductList>
  useSuspenseProductLists: (
    input?: SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListListResult<TProductList>>
    }
  ) => UseSuspenseProductListsResult<TProductList>
  useProductList: (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    }
  ) => UseProductListResult<TProductList>
  useSuspenseProductList: (
    input: SuspenseDetailInput<TDetailInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<TProductList | null>
    }
  ) => UseSuspenseProductListResult<TProductList>
  useProductListDetails: (
    inputs: TDetailInput[],
    options?: {
      enabled?: boolean
      queryOptions?: ReadQueryOptions<TProductList | null>
    }
  ) => QueryResult<TProductList | null>[]
  useCreateFavoriteProductList: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      CreateFavoriteProductListInput,
      TContext
    >
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
    >
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
    >
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
    >
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
    >
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
    >
  ) => UseMutationResult<
    TProductListItem | null,
    unknown,
    AddFavoriteProductListItemInput,
    TContext
  >
  useCreateProductListCart: <TContext = unknown>(
    options?: ProductListMutationOptions<TCart, CreateProductListCartInput, TContext>
  ) => UseMutationResult<TCart, unknown, CreateProductListCartInput, TContext>
  useUpdateProductListItem: <TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      UpdateProductListItemInput,
      TContext
    >
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
    >
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
    >
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
    >
  ) => UseMutationResult<
    ProductListDeleteResponse,
    unknown,
    DeleteProductListItemInput,
    TContext
  >
}

const compactRecord = (record: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  )

const stripListInput = (input: ProductListListInputBase) => {
  const {
    enabled: _enabled,
    customerId: _customerId,
    page: _page,
    ...params
  } = input

  return params
}

const stripDetailInput = (input: ProductListDetailInputBase) => {
  const { enabled: _enabled, customerId: _customerId, ...params } = input
  return params
}

const createDefaultListParams = <TListInput extends ProductListListInputBase>(
  input: TListInput,
  defaultPageSize: number
) => {
  const params = stripListInput(input)

  if (typeof input.page !== "number") {
    return compactRecord(params)
  }

  const pagination = resolvePagination(
    {
      page: input.page,
      limit: input.limit,
      offset: input.offset,
    },
    defaultPageSize
  )

  return compactRecord({
    ...params,
    limit: pagination.limit,
    offset: pagination.offset,
  })
}

const withCustomerScope = <TParams, TInput extends { customerId?: string | null }>(
  params: TParams,
  input: TInput
) =>
  ({
    ...(params as object),
    customerId: input.customerId ?? null,
  })

export function createProductListHooks<
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
      queryKeyNamespace
    )
  const buildList =
    buildListParams ??
    ((input: TListInput) =>
      createDefaultListParams(input, defaultPageSize) as TListParams)
  const buildDetail =
    buildDetailParams ??
    ((input: TDetailInput) => stripDetailInput(input) as TDetailParams)
  const buildListKey =
    buildListKeyParams ??
    ((input: TListInput, params: TListParams) =>
      withCustomerScope(params, input) as TListKeyParams)
  const buildDetailKey =
    buildDetailKeyParams ??
    ((input: TDetailInput, params: TDetailParams) =>
      withCustomerScope(params, input) as TDetailKeyParams)

  const getListQueryOptions = (
    input: TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    }
  ): QueryFactoryOptions<ProductListListResult<TProductList>> => {
    const listParams = buildList(input)

    return {
      queryKey: resolvedQueryKeys.list(buildListKey(input, listParams)),
      queryFn: ({ signal }) => service.listProductLists(listParams, signal),
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    }
  }

  const getDetailQueryOptions = (
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    }
  ): QueryFactoryOptions<TProductList | null> => {
    const detailParams = buildDetail(input)

    return {
      queryKey: resolvedQueryKeys.detail(buildDetailKey(input, detailParams)),
      queryFn: ({ signal }) => {
        if (!input.id) {
          throw new Error("Product list id is required")
        }

        return service.getProductList(detailParams, signal)
      },
      ...resolvedCacheConfig.userData,
      ...(options?.queryOptions ?? {}),
    }
  }

  const invalidateProductLists = (
    queryClient: ReturnType<typeof useQueryClient>
  ) =>
    queryClient.invalidateQueries({
      queryKey: resolvedQueryKeys.all(),
    })

  function useProductLists(
    input = {} as TListInput,
    options?: {
      queryOptions?: ReadQueryOptions<ProductListListResult<TProductList>>
    }
  ): UseProductListsResult<TProductList> {
    const enabled = input.enabled ?? true
    const query = useQuery({
      ...getListQueryOptions(input, options),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      productLists: data?.productLists ?? [],
      count: data?.count ?? 0,
      limit: data?.limit ?? input.limit ?? defaultPageSize,
      offset: data?.offset ?? input.offset ?? 0,
      isLoading,
      isFetching,
      isSuccess,
      error: toErrorMessage(error),
      query,
    }
  }

  function useSuspenseProductLists(
    input = {} as SuspenseListInput<TListInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<ProductListListResult<TProductList>>
    }
  ): UseSuspenseProductListsResult<TProductList> {
    const query = useSuspenseQuery({
      ...getListQueryOptions(input as TListInput, {
        queryOptions: options?.queryOptions as ReadQueryOptions<
          ProductListListResult<TProductList>
        >,
      }),
    })
    const { data, isFetching } = query

    return {
      productLists: data.productLists,
      count: data.count,
      limit: data.limit,
      offset: data.offset,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function useProductList(
    input: TDetailInput,
    options?: {
      queryOptions?: ReadQueryOptions<TProductList | null>
    }
  ): UseProductListResult<TProductList> {
    const enabled = Boolean(input.id) && (input.enabled ?? true)
    const query = useQuery({
      ...getDetailQueryOptions(input, options),
      enabled,
    })
    const { data, isLoading, isFetching, isSuccess, error } = query

    return {
      productList: data ?? null,
      isLoading,
      isFetching,
      isSuccess,
      error: toErrorMessage(error),
      query,
    }
  }

  function useSuspenseProductList(
    input: SuspenseDetailInput<TDetailInput>,
    options?: {
      queryOptions?: SuspenseQueryOptions<TProductList | null>
    }
  ): UseSuspenseProductListResult<TProductList> {
    const query = useSuspenseQuery({
      ...getDetailQueryOptions(input as TDetailInput, {
        queryOptions: options?.queryOptions as ReadQueryOptions<
          TProductList | null
        >,
      }),
    })
    const { data, isFetching } = query

    return {
      productList: data ?? null,
      isLoading: false,
      isFetching,
      isSuccess: true,
      error: null,
      query,
    }
  }

  function useProductListDetails(
    inputs: TDetailInput[],
    options?: {
      enabled?: boolean
      queryOptions?: ReadQueryOptions<TProductList | null>
    }
  ): QueryResult<TProductList | null>[] {
    const enabled = options?.enabled ?? true

    return useQueries({
      queries: inputs.map((input) => ({
        ...getDetailQueryOptions(input, {
          queryOptions: options?.queryOptions,
        }),
        enabled: enabled && Boolean(input.id),
      })),
    })
  }

  function useCreateFavoriteProductList<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      CreateFavoriteProductListInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductList | null,
      unknown,
      CreateFavoriteProductListInput,
      TContext
    >({
      mutationFn: service.createFavoriteProductList,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useCreateCustomProductList<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      CreateCustomProductListInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductList | null,
      unknown,
      CreateCustomProductListInput,
      TContext
    >({
      mutationFn: service.createCustomProductList,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useUpdateProductList<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductList | null,
      UpdateProductListInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductList | null,
      unknown,
      UpdateProductListInput,
      TContext
    >({
      mutationFn: service.updateProductList,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useDeleteProductList<TContext = unknown>(
    options?: ProductListMutationOptions<
      ProductListDeleteResponse,
      DeleteProductListInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      ProductListDeleteResponse,
      unknown,
      DeleteProductListInput,
      TContext
    >({
      mutationFn: service.deleteProductList,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useAddProductListItem<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      AddProductListItemInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      AddProductListItemInput,
      TContext
    >({
      mutationFn: service.addProductListItem,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useAddFavoriteProductListItem<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      AddFavoriteProductListItemInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      AddFavoriteProductListItemInput,
      TContext
    >({
      mutationFn: service.addFavoriteProductListItem,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useCreateProductListCart<TContext = unknown>(
    options?: ProductListMutationOptions<TCart, CreateProductListCartInput, TContext>
  ) {
    const queryClient = useQueryClient()

    return useMutation<TCart, unknown, CreateProductListCartInput, TContext>({
      mutationFn: service.createProductListCart,
      onMutate: options?.onMutate,
      onSuccess: (cart, variables, context) => {
        if (cartQueryKeys) {
          syncCartCaches(queryClient, cartQueryKeys, cart, {
            isActiveCartQueryKey,
          })
          queryClient.invalidateQueries({ queryKey: cartQueryKeys.all() })
        }
        cartStorage?.set(cart.id)
        options?.onSuccess?.(cart, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useUpdateProductListItem<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      UpdateProductListItemInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      UpdateProductListItemInput,
      TContext
    >({
      mutationFn: service.updateProductListItem,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useChangeProductListItemQuantity<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      ChangeProductListItemQuantityInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      ChangeProductListItemQuantityInput,
      TContext
    >({
      mutationFn: service.changeProductListItemQuantity,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useIncrementProductListItem<TContext = unknown>(
    options?: ProductListMutationOptions<
      TProductListItem | null,
      IncrementProductListItemInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      TProductListItem | null,
      unknown,
      IncrementProductListItemInput,
      TContext
    >({
      mutationFn: service.incrementProductListItem,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  function useDeleteProductListItem<TContext = unknown>(
    options?: ProductListMutationOptions<
      ProductListDeleteResponse,
      DeleteProductListItemInput,
      TContext
    >
  ) {
    const queryClient = useQueryClient()

    return useMutation<
      ProductListDeleteResponse,
      unknown,
      DeleteProductListItemInput,
      TContext
    >({
      mutationFn: service.deleteProductListItem,
      onMutate: options?.onMutate,
      onSuccess: (data, variables, context) => {
        invalidateProductLists(queryClient)
        options?.onSuccess?.(data, variables, context)
      },
      onError: options?.onError,
      onSettled: options?.onSettled,
    })
  }

  return {
    getListQueryOptions,
    getDetailQueryOptions,
    useProductLists,
    useSuspenseProductLists,
    useProductList,
    useSuspenseProductList,
    useProductListDetails,
    useCreateFavoriteProductList,
    useCreateCustomProductList,
    useUpdateProductList,
    useDeleteProductList,
    useAddProductListItem,
    useAddFavoriteProductListItem,
    useCreateProductListCart,
    useUpdateProductListItem,
    useChangeProductListItemQuantity,
    useIncrementProductListItem,
    useDeleteProductListItem,
  }
}
