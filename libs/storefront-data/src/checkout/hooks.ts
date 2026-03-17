import {
  type QueryClient,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query"
import {
  getCachedCartById,
  patchCartCaches,
  syncCartCaches,
} from "../shared/cart-cache-sync"
import type { CartQueryKeys } from "../cart/types"
import {
  type CacheConfig,
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import { createCheckoutQueryKeys } from "./query-keys"
import type {
  CheckoutCartLike,
  CheckoutMutationOptions,
  CheckoutPaymentInputBase,
  CheckoutQueryKeys,
  CheckoutService,
  CheckoutShippingInputBase,
  ShippingOptionLike,
  UseCheckoutPaymentResult,
  UseCheckoutShippingResult,
} from "./types"
export type { CheckoutMutationOptions } from "./types"

export type CheckoutShippingHookInput<
  TCart extends CheckoutCartLike,
  TShippingOption extends ShippingOptionLike,
> = CheckoutShippingInputBase & {
  cart?: TCart | null
  calculatePrices?: boolean
  buildShippingData?: (option: TShippingOption) => Record<string, unknown>
}

export type CheckoutPaymentHookInput<TCart extends CheckoutCartLike> =
  CheckoutPaymentInputBase & {
    cart?: TCart | null
  }

type CheckoutShippingSuspenseHookInput<
  TCart extends CheckoutCartLike,
  TShippingOption extends ShippingOptionLike,
> = Omit<
  CheckoutShippingHookInput<TCart, TShippingOption>,
  "enabled" | "cartId"
> & {
  cartId: string
}

type CheckoutPaymentSuspenseHookInput<TCart extends CheckoutCartLike> = Omit<
  CheckoutPaymentHookInput<TCart>,
  "enabled"
>

export type CreateCheckoutHooksConfig<
  TCart extends CheckoutCartLike,
  TShippingOption extends ShippingOptionLike,
  TPaymentProvider,
  TPaymentCollection extends TCart["payment_collection"],
  TCompleteResult,
> = {
  service: CheckoutService<
    TCart,
    TShippingOption,
    TPaymentProvider,
    TPaymentCollection,
    TCompleteResult
  >
  queryKeys?: CheckoutQueryKeys
  queryKeyNamespace?: QueryNamespace
  cacheConfig?: CacheConfig
  cartQueryKeys?: CartQueryKeys
}

export function createCheckoutHooks<
  TCart extends CheckoutCartLike,
  TShippingOption extends ShippingOptionLike,
  TPaymentProvider,
  TPaymentCollection extends TCart["payment_collection"],
  TCompleteResult,
>({
  service,
  queryKeys,
  queryKeyNamespace = "storefront-data",
  cacheConfig,
  cartQueryKeys,
}: CreateCheckoutHooksConfig<
  TCart,
  TShippingOption,
  TPaymentProvider,
  TPaymentCollection,
  TCompleteResult
>) {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createCheckoutQueryKeys(queryKeyNamespace)

  const getPaymentProvidersQueryOptions = (regionId: string) => ({
    queryKey: resolvedQueryKeys.paymentProviders(regionId),
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      service.listPaymentProviders(regionId, signal),
    ...resolvedCacheConfig.semiStatic,
  })

  function fetchPaymentProviders(queryClient: QueryClient, regionId: string) {
    const queryOptions = getPaymentProvidersQueryOptions(regionId)
    return queryClient.fetchQuery({
      queryKey: queryOptions.queryKey,
      queryFn: queryOptions.queryFn,
      ...getPrefetchCacheOptions(resolvedCacheConfig, "semiStatic"),
    })
  }

  const buildCalculatedById = (
    calculatedOptions: TShippingOption[],
    calculatedQueries: Array<{ data: TShippingOption | undefined }>
  ) => {
    const calculatedById = new Map<string, TShippingOption>()
    for (const [index, query] of calculatedQueries.entries()) {
      const option = calculatedOptions[index]
      if (!(option && query.data)) {
        continue
      }
      calculatedById.set(option.id, query.data)
    }
    return calculatedById
  }

  const buildShippingPrices = (
    shippingOptions: TShippingOption[],
    calculatedById: Map<string, TShippingOption>
  ) => {
    const shippingPrices: Record<string, number> = {}
    for (const option of shippingOptions) {
      if (option.price_type === "calculated") {
        const calculated = calculatedById.get(option.id)
        if (calculated && typeof calculated.amount === "number") {
          shippingPrices[option.id] = calculated.amount
        }
        continue
      }
      if (typeof option.amount === "number") {
        shippingPrices[option.id] = option.amount
      }
    }
    return shippingPrices
  }

  const patchPaymentCollection = (
    cart: TCart,
    paymentCollection: TPaymentCollection
  ): TCart => ({
    ...cart,
    payment_collection: paymentCollection,
  })
  function useShippingMethodMutation<TContext = unknown>(
    cartId: string | undefined,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: Record<string, unknown> },
      TContext
    >
  ) {
    const queryClient = useQueryClient()
    const onMutate = options?.onMutate

    return useMutation<
      TCart,
      unknown,
      { optionId: string; data?: Record<string, unknown> },
      TContext
    >({
      mutationFn: ({
        optionId,
        data,
      }: {
        optionId: string
        data?: Record<string, unknown>
      }) => {
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        return service.addShippingMethod(cartId, optionId, data)
      },
      onMutate: onMutate ? async (variables) => onMutate(variables) : undefined,
      onSuccess: (cart, variables, context) => {
        if (cartQueryKeys) {
          syncCartCaches(queryClient, cartQueryKeys, cart)
        }
        options?.onSuccess?.(cart, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  function usePaymentMutation<TContext = unknown>(
    cartId: string | undefined,
    options?: CheckoutMutationOptions<TPaymentCollection, string, TContext>
  ) {
    const queryClient = useQueryClient()
    const onMutate = options?.onMutate

    return useMutation<TPaymentCollection, unknown, string, TContext>({
      mutationFn: (providerId: string) => {
        if (!cartId) {
          throw new Error("Cart id is required")
        }
        return service.initiatePaymentSession(cartId, providerId)
      },
      onMutate: onMutate ? async (variables) => onMutate(variables) : undefined,
      onSuccess: (data, variables, context) => {
        if (cartQueryKeys && cartId) {
          patchCartCaches<TCart>(queryClient, cartQueryKeys, cartId, {
            patch: (cached) => patchPaymentCollection(cached, data),
          })
          queryClient.invalidateQueries({
            queryKey: cartQueryKeys.all(),
          })
        }
        options?.onSuccess?.(data, variables, context)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
    })
  }

  const resolvePaymentState = (cart: TCart | null | undefined) => {
    const hasShippingMethod = (cart?.shipping_methods?.length ?? 0) > 0
    const hasPaymentCollection = Boolean(cart?.payment_collection)
    const hasPaymentSessions =
      (cart?.payment_collection?.payment_sessions?.length ?? 0) > 0

    return {
      hasShippingMethod,
      hasPaymentCollection,
      hasPaymentSessions,
    }
  }

  function useReactiveCart(
    inputCart: TCart | null | undefined,
    cartId: string | undefined
  ): TCart | null {
    const queryClient = useQueryClient()
    const canSubscribeToCart = Boolean(!inputCart && cartId && cartQueryKeys)
    const fallbackReactiveCartKey: readonly unknown[] = [
      ...resolvedQueryKeys.all(),
      "reactive-cart",
      cartId ?? "unknown",
    ]
    const initialCart =
      canSubscribeToCart && cartId && cartQueryKeys
        ? getCachedCartById<TCart>(queryClient, cartQueryKeys, cartId)
        : null

    const { data: cachedCart = initialCart } = useQuery({
      queryKey:
        canSubscribeToCart && cartId && cartQueryKeys
          ? cartQueryKeys.detail(cartId)
          : fallbackReactiveCartKey,
      queryFn: () =>
        canSubscribeToCart && cartId && cartQueryKeys
          ? getCachedCartById<TCart>(queryClient, cartQueryKeys, cartId)
          : null,
      enabled: canSubscribeToCart,
      initialData: initialCart,
      staleTime: Number.POSITIVE_INFINITY,
      gcTime: Number.POSITIVE_INFINITY,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })

    return inputCart ?? cachedCart ?? null
  }

  function useCheckoutShipping<TContext = unknown>(
    input: CheckoutShippingHookInput<TCart, TShippingOption>,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: Record<string, unknown> },
      TContext
    >
  ): UseCheckoutShippingResult<TShippingOption, TCart> {
    const cartId = input.cartId
    const enabled = input.enabled ?? Boolean(cartId)
    const calculatePrices = input.calculatePrices ?? true
    const cacheKey = input.cacheKey

    const {
      data: shippingOptions = [],
      isLoading,
      isFetching,
    } = useQuery({
      queryKey: resolvedQueryKeys.shippingOptions(
        cartId ?? "unknown",
        cacheKey
      ),
      queryFn: ({ signal }) => {
        if (!cartId) {
          return []
        }
        return service.listShippingOptions(cartId, signal)
      },
      enabled,
      ...resolvedCacheConfig.realtime,
    })

    const calculatedOptions = shippingOptions.filter(
      (option) => option.price_type === "calculated"
    )
    const calculateShippingOption = service.calculateShippingOption

    const shouldCalculate =
      Boolean(cartId) &&
      calculatePrices &&
      typeof calculateShippingOption === "function"
    const cartIdValue = cartId ?? ""

    const calculatedQueries = useQueries({
      queries: shouldCalculate
        ? calculatedOptions.map((option) => {
            const data = input.buildShippingData?.(option)
            return {
              queryKey: resolvedQueryKeys.shippingOptionPrice({
                cartId: cartIdValue,
                optionId: option.id,
                data,
              }),
              queryFn: ({ signal }: { signal?: AbortSignal }) =>
                calculateShippingOption(
                  option.id,
                  {
                    cart_id: cartIdValue,
                    data,
                  },
                  signal
                ),
              enabled,
              ...resolvedCacheConfig.realtime,
            }
          })
        : [],
    })

    const calculatedById = buildCalculatedById(
      calculatedOptions,
      calculatedQueries
    )
    const shippingPrices = buildShippingPrices(shippingOptions, calculatedById)

    const {
      mutate: mutateShippingMethod,
      mutateAsync: mutateShippingMethodAsync,
      isPending: isSettingShipping,
    } = useShippingMethodMutation(cartId, options)

    const setShippingMethod = (
      optionId: string,
      data?: Record<string, unknown>
    ) => {
      mutateShippingMethod({ optionId, data })
    }

    const setShippingMethodAsync = (
      optionId: string,
      data?: Record<string, unknown>
    ) => mutateShippingMethodAsync({ optionId, data })

    const selectedShippingMethodId =
      input.cart?.shipping_methods?.[0]?.shipping_option_id
    const selectedOption = shippingOptions.find(
      (option) => option.id === selectedShippingMethodId
    )

    return {
      shippingOptions,
      shippingPrices,
      isLoading,
      isFetching,
      isCalculating: calculatedQueries.some((query) => query.isFetching),
      setShippingMethod,
      setShippingMethodAsync,
      isSettingShipping,
      selectedShippingMethodId,
      selectedOption,
    }
  }

  function useSuspenseCheckoutShipping<TContext = unknown>(
    input: CheckoutShippingSuspenseHookInput<TCart, TShippingOption>,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: Record<string, unknown> },
      TContext
    >
  ): UseCheckoutShippingResult<TShippingOption, TCart> {
    const cartId = input.cartId
    if (!cartId) {
      throw new Error("Cart id is required for checkout shipping")
    }
    const calculatePrices = input.calculatePrices ?? true
    const cacheKey = input.cacheKey

    const { data: shippingOptions, isFetching } = useSuspenseQuery({
      queryKey: resolvedQueryKeys.shippingOptions(cartId, cacheKey),
      queryFn: ({ signal }) => service.listShippingOptions(cartId, signal),
      ...resolvedCacheConfig.realtime,
    })

    const calculatedOptions = shippingOptions.filter(
      (option) => option.price_type === "calculated"
    )
    const calculateShippingOption = service.calculateShippingOption

    const shouldCalculate =
      calculatePrices && typeof calculateShippingOption === "function"

    const calculatedQueries = useSuspenseQueries({
      queries: shouldCalculate
        ? calculatedOptions.map((option) => {
            const data = input.buildShippingData?.(option)
            return {
              queryKey: resolvedQueryKeys.shippingOptionPrice({
                cartId,
                optionId: option.id,
                data,
              }),
              queryFn: ({ signal }: { signal?: AbortSignal }) =>
                calculateShippingOption(
                  option.id,
                  {
                    cart_id: cartId,
                    data,
                  },
                  signal
                ),
              ...resolvedCacheConfig.realtime,
            }
          })
        : [],
    })

    const calculatedById = buildCalculatedById(
      calculatedOptions,
      calculatedQueries
    )
    const shippingPrices = buildShippingPrices(shippingOptions, calculatedById)

    const {
      mutate: mutateShippingMethod,
      mutateAsync: mutateShippingMethodAsync,
      isPending: isSettingShipping,
    } = useShippingMethodMutation(cartId, options)

    const setShippingMethod = (
      optionId: string,
      data?: Record<string, unknown>
    ) => {
      mutateShippingMethod({ optionId, data })
    }

    const setShippingMethodAsync = (
      optionId: string,
      data?: Record<string, unknown>
    ) => mutateShippingMethodAsync({ optionId, data })

    const selectedShippingMethodId =
      input.cart?.shipping_methods?.[0]?.shipping_option_id
    const selectedOption = shippingOptions.find(
      (option) => option.id === selectedShippingMethodId
    )

    return {
      shippingOptions,
      shippingPrices,
      isLoading: false,
      isFetching,
      isCalculating: calculatedQueries.some((query) => query.isFetching),
      setShippingMethod,
      setShippingMethodAsync,
      isSettingShipping,
      selectedShippingMethodId,
      selectedOption,
    }
  }

  function useCheckoutPayment<TPaymentContext = unknown>(
    input: CheckoutPaymentHookInput<TCart>,
    options?: CheckoutMutationOptions<
      TPaymentCollection,
      string,
      TPaymentContext
    >
  ): UseCheckoutPaymentResult<TPaymentProvider, TPaymentCollection> {
    const cartId = input.cartId
    const effectiveCart = useReactiveCart(input.cart, cartId)
    const resolvedCartId = cartId ?? effectiveCart?.id
    const regionId = input.regionId ?? effectiveCart?.region_id
    const enabled = input.enabled ?? Boolean(regionId)

    const paymentProvidersQueryOptions = regionId
      ? getPaymentProvidersQueryOptions(regionId)
      : {
          queryKey: resolvedQueryKeys.paymentProviders("unknown"),
          queryFn: async () => [] as TPaymentProvider[],
          ...resolvedCacheConfig.semiStatic,
        }

    const {
      data: paymentProviders = [],
      isLoading,
      isFetching,
    } = useQuery({
      ...paymentProvidersQueryOptions,
      enabled,
    })

    const {
      mutate: initiatePayment,
      mutateAsync: initiatePaymentAsync,
      isPending: isInitiatingPayment,
    } = usePaymentMutation(resolvedCartId, options)
    const paymentState = resolvePaymentState(effectiveCart)
    const canInitiatePayment = Boolean(
      resolvedCartId && paymentState.hasShippingMethod
    )

    return {
      paymentProviders,
      initiatePayment,
      initiatePaymentAsync,
      isInitiatingPayment,
      isLoading,
      isFetching,
      canInitiatePayment,
      hasPaymentCollection: paymentState.hasPaymentCollection,
      hasPaymentSessions: paymentState.hasPaymentSessions,
    }
  }

  function useSuspenseCheckoutPayment<TSuspensePaymentContext = unknown>(
    input: CheckoutPaymentSuspenseHookInput<TCart>,
    options?: CheckoutMutationOptions<
      TPaymentCollection,
      string,
      TSuspensePaymentContext
    >
  ): UseCheckoutPaymentResult<TPaymentProvider, TPaymentCollection> {
    const cartId = input.cartId
    const effectiveCart = useReactiveCart(input.cart, cartId)
    const resolvedCartId = cartId ?? effectiveCart?.id
    const regionId = input.regionId ?? effectiveCart?.region_id

    const paymentProvidersQueryOptions = regionId
      ? getPaymentProvidersQueryOptions(regionId)
      : {
          queryKey: resolvedQueryKeys.paymentProviders("unknown"),
          queryFn: async () => [] as TPaymentProvider[],
          ...resolvedCacheConfig.semiStatic,
        }
    const { data: paymentProviders, isFetching } = useSuspenseQuery(
      paymentProvidersQueryOptions
    )

    const {
      mutate: initiatePayment,
      mutateAsync: initiatePaymentAsync,
      isPending: isInitiatingPayment,
    } = usePaymentMutation(resolvedCartId, options)
    const paymentState = resolvePaymentState(effectiveCart)
    const canInitiatePayment = Boolean(
      resolvedCartId && paymentState.hasShippingMethod
    )

    return {
      paymentProviders,
      initiatePayment,
      initiatePaymentAsync,
      isInitiatingPayment,
      isLoading: false,
      isFetching,
      canInitiatePayment,
      hasPaymentCollection: paymentState.hasPaymentCollection,
      hasPaymentSessions: paymentState.hasPaymentSessions,
    }
  }

  return {
    useCheckoutShipping,
    useSuspenseCheckoutShipping,
    useCheckoutPayment,
    useSuspenseCheckoutPayment,
    getPaymentProvidersQueryOptions,
    fetchPaymentProviders,
  }
}

export type CheckoutHooks<
  TCart extends CheckoutCartLike,
  TShippingOption extends ShippingOptionLike,
  TPaymentProvider,
  TPaymentCollection extends TCart["payment_collection"],
  TCompleteResult,
> = ReturnType<
  typeof createCheckoutHooks<
    TCart,
    TShippingOption,
    TPaymentProvider,
    TPaymentCollection,
    TCompleteResult
  >
>
