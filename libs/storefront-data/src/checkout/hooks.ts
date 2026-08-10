import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import { omitUndefined } from "@techsio/std/object"

import type { CartQueryKeys } from "../cart/types"
import {
  createCacheConfig,
  getPrefetchCacheOptions,
} from "../shared/cache-config"
import type { CacheConfig } from "../shared/cache-config"
import {
  getCachedCartById,
  patchCartCaches,
  syncCartCaches,
} from "../shared/cart-cache-sync"
import type {
  ActiveCartQueryKeyMatcher,
  CartDecoder,
} from "../shared/cart-cache-sync"
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
  buildShippingData?: (option: TShippingOption) => object
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

export interface CreateCheckoutHooksConfig<
  TCart extends CheckoutCartLike,
  TShippingOption extends ShippingOptionLike,
  TPaymentProvider,
  TPaymentCollection extends TCart["payment_collection"],
  TCompleteResult,
> {
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
  decodeCart: CartDecoder<TCart>
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher | undefined
}

const buildShippingPrices = <TShippingOption extends ShippingOptionLike>(
  shippingOptions: TShippingOption[],
  calculatedById: Map<string, TShippingOption>,
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

const patchPaymentCollection = <TCart extends CheckoutCartLike>(
  cart: TCart,
  paymentCollection: TCart["payment_collection"],
): TCart => ({
  ...cart,
  payment_collection: paymentCollection,
})

const resolvePaymentState = (cart: CheckoutCartLike | null | undefined) => {
  const hasShippingMethod = (cart?.shipping_methods?.length ?? 0) > 0
  const hasPaymentCollection = Boolean(cart?.payment_collection)
  const hasPaymentSessions =
    (cart?.payment_collection?.payment_sessions?.length ?? 0) > 0

  return {
    hasPaymentCollection,
    hasPaymentSessions,
    hasShippingMethod,
  }
}

export const createCheckoutHooks = <
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
  decodeCart,
  isActiveCartQueryKey,
}: CreateCheckoutHooksConfig<
  TCart,
  TShippingOption,
  TPaymentProvider,
  TPaymentCollection,
  TCompleteResult
>) => {
  const resolvedCacheConfig = cacheConfig ?? createCacheConfig()
  const resolvedQueryKeys =
    queryKeys ?? createCheckoutQueryKeys(queryKeyNamespace)

  const cartCacheOptions = isActiveCartQueryKey
    ? { isActiveCartQueryKey }
    : undefined

  const getPaymentProvidersQueryOptions = (regionId: string) => ({
    queryFn: async ({ signal }: { signal?: AbortSignal }) =>
      await service.listPaymentProviders(regionId, signal),
    queryKey: resolvedQueryKeys.paymentProviders(regionId),
    ...resolvedCacheConfig.semiStatic,
  })

  const fetchPaymentProviders = async (
    queryClient: QueryClient,
    regionId: string,
  ) => {
    const queryOptions = getPaymentProvidersQueryOptions(regionId)
    return await queryClient.fetchQuery({
      queryFn: queryOptions.queryFn,
      queryKey: queryOptions.queryKey,
      ...getPrefetchCacheOptions(resolvedCacheConfig, "semiStatic"),
    })
  }

  const buildCalculatedById = (
    calculatedOptions: TShippingOption[],
    calculatedQueries: { data: TShippingOption | undefined }[],
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

  const useShippingMethodMutation = <TContext = unknown>(
    cartId: string | undefined,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: object },
      TContext
    >,
  ) => {
    const queryClient = useQueryClient()
    const onMutate = options?.onMutate

    return useMutation<
      TCart,
      unknown,
      { optionId: string; data?: object },
      TContext
    >({
      mutationFn: async ({
        optionId,
        data,
      }: {
        optionId: string
        data?: object
      }) => {
        if (cartId === undefined || cartId.length === 0) {
          throw new Error("Cart id is required")
        }
        return await service.addShippingMethod(cartId, optionId, data)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(onMutate
        ? { onMutate: async (variables) => await onMutate(variables) }
        : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: (cart, variables, context) => {
        if (cartQueryKeys) {
          syncCartCaches(queryClient, cartQueryKeys, cart)
        }
        options?.onSuccess?.(cart, variables, context)
      },
    })
  }

  const usePaymentMutation = <TContext = unknown>(
    cartId: string | undefined,
    options?: CheckoutMutationOptions<TPaymentCollection, string, TContext>,
  ) => {
    const queryClient = useQueryClient()
    const onMutate = options?.onMutate

    return useMutation<TPaymentCollection, unknown, string, TContext>({
      mutationFn: async (providerId: string) => {
        if (cartId === undefined || cartId.length === 0) {
          throw new Error("Cart id is required")
        }
        return await service.initiatePaymentSession(cartId, providerId)
      },
      onError: (error, variables, context) => {
        options?.onError?.(error, variables, context)
      },
      ...(onMutate
        ? { onMutate: async (variables) => await onMutate(variables) }
        : {}),
      onSettled: (data, error, variables, context) => {
        options?.onSettled?.(data, error, variables, context)
      },
      onSuccess: async (data, variables, context) => {
        if (cartQueryKeys && cartId !== undefined && cartId.length > 0) {
          patchCartCaches(queryClient, cartQueryKeys, cartId, {
            decodeCart,
            patch: (cached) => patchPaymentCollection(cached, data),
          })
          await queryClient.invalidateQueries({
            queryKey: cartQueryKeys.all(),
          })
        }
        options?.onSuccess?.(data, variables, context)
      },
    })
  }

  const useReactiveCart = (
    inputCart: TCart | null | undefined,
    cartId: string | undefined,
  ): TCart | null => {
    const queryClient = useQueryClient()
    const canSubscribeToCart = Boolean(
      cartId !== undefined && cartId.length > 0 && cartQueryKeys,
    )
    const fallbackReactiveCartKey: readonly unknown[] = [
      ...resolvedQueryKeys.all(),
      "reactive-cart",
      cartId ?? "unknown",
    ]
    const readCachedCart = () =>
      canSubscribeToCart && cartId !== undefined && cartQueryKeys
        ? getCachedCartById<TCart>(
            queryClient,
            cartQueryKeys,
            cartId,
            decodeCart,
            cartCacheOptions,
          )
        : null
    const initialCart = readCachedCart() ?? inputCart ?? null

    const { data: cachedCart = initialCart } = useQuery({
      enabled: canSubscribeToCart,
      gcTime: Number.POSITIVE_INFINITY,
      initialData: initialCart,
      queryFn: readCachedCart,
      queryKey:
        canSubscribeToCart && cartId !== undefined && cartQueryKeys
          ? cartQueryKeys.detail(cartId)
          : fallbackReactiveCartKey,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    })

    return cachedCart ?? inputCart ?? null
  }

  const useCheckoutShipping = <TContext = unknown>(
    input: CheckoutShippingHookInput<TCart, TShippingOption>,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: object },
      TContext
    >,
  ): UseCheckoutShippingResult<TShippingOption, TCart> => {
    const { cartId } = input
    const enabled = input.enabled ?? Boolean(cartId)
    const calculatePrices = input.calculatePrices ?? true
    const { cacheKey } = input

    const effectiveCart = useReactiveCart(input.cart, cartId)

    const {
      data: shippingOptions = [],
      isLoading,
      isFetching,
    } = useQuery({
      enabled,
      queryFn: async ({ signal }) => {
        if (cartId === undefined || cartId.length === 0) {
          return []
        }
        return await service.listShippingOptions(cartId, signal)
      },
      queryKey: resolvedQueryKeys.shippingOptions(
        cartId ?? "unknown",
        cacheKey,
      ),
      ...resolvedCacheConfig.realtime,
    })

    const calculatedOptions = shippingOptions.filter(
      (option) => option.price_type === "calculated",
    )
    const { calculateShippingOption } = service

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
              enabled,
              queryFn: async ({ signal }: { signal?: AbortSignal }) =>
                await calculateShippingOption(
                  option.id,
                  omitUndefined({ cart_id: cartIdValue, data }),
                  signal,
                ),
              queryKey: resolvedQueryKeys.shippingOptionPrice(
                omitUndefined({
                  cartId: cartIdValue,
                  data,
                  optionId: option.id,
                }),
              ),
              ...resolvedCacheConfig.realtime,
            }
          })
        : [],
    })

    const calculatedById = buildCalculatedById(
      calculatedOptions,
      calculatedQueries,
    )
    const shippingPrices = buildShippingPrices(shippingOptions, calculatedById)

    const {
      mutate: mutateShippingMethod,
      mutateAsync: mutateShippingMethodAsync,
      isPending: isSettingShipping,
    } = useShippingMethodMutation(cartId, options)

    const setShippingMethod = (optionId: string, data?: object) => {
      mutateShippingMethod(omitUndefined({ data, optionId }))
    }

    const setShippingMethodAsync = async (optionId: string, data?: object) =>
      await mutateShippingMethodAsync(omitUndefined({ data, optionId }))

    const selectedShippingMethodId =
      effectiveCart?.shipping_methods?.[0]?.shipping_option_id
    const selectedShippingMethodData =
      effectiveCart?.shipping_methods?.[0]?.data
    const selectedOption = shippingOptions.find(
      (option) => option.id === selectedShippingMethodId,
    )

    return omitUndefined({
      isCalculating: calculatedQueries.some((query) => query.isFetching),
      isFetching,
      isLoading,
      isSettingShipping,
      selectedOption,
      selectedShippingMethodData,
      selectedShippingMethodId,
      setShippingMethod,
      setShippingMethodAsync,
      shippingOptions,
      shippingPrices,
    })
  }

  const useSuspenseCheckoutShipping = <TContext = unknown>(
    input: CheckoutShippingSuspenseHookInput<TCart, TShippingOption>,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: object },
      TContext
    >,
  ): UseCheckoutShippingResult<TShippingOption, TCart> => {
    const { cartId } = input
    if (!cartId) {
      throw new Error("Cart id is required for checkout shipping")
    }
    const calculatePrices = input.calculatePrices ?? true
    const { cacheKey } = input
    const effectiveCart = useReactiveCart(input.cart, cartId)

    const { data: shippingOptions, isFetching } = useSuspenseQuery({
      queryFn: async ({ signal }) =>
        await service.listShippingOptions(cartId, signal),
      queryKey: resolvedQueryKeys.shippingOptions(cartId, cacheKey),
      ...resolvedCacheConfig.realtime,
    })

    const calculatedOptions = shippingOptions.filter(
      (option) => option.price_type === "calculated",
    )
    const { calculateShippingOption } = service

    const shouldCalculate =
      calculatePrices && typeof calculateShippingOption === "function"

    const calculatedQueries = useSuspenseQueries({
      queries: shouldCalculate
        ? calculatedOptions.map((option) => {
            const data = input.buildShippingData?.(option)
            return {
              queryFn: async ({ signal }: { signal?: AbortSignal }) =>
                await calculateShippingOption(
                  option.id,
                  omitUndefined({ cart_id: cartId, data }),
                  signal,
                ),
              queryKey: resolvedQueryKeys.shippingOptionPrice(
                omitUndefined({ cartId, data, optionId: option.id }),
              ),
              ...resolvedCacheConfig.realtime,
            }
          })
        : [],
    })

    const calculatedById = buildCalculatedById(
      calculatedOptions,
      calculatedQueries,
    )
    const shippingPrices = buildShippingPrices(shippingOptions, calculatedById)

    const {
      mutate: mutateShippingMethod,
      mutateAsync: mutateShippingMethodAsync,
      isPending: isSettingShipping,
    } = useShippingMethodMutation(cartId, options)

    const setShippingMethod = (optionId: string, data?: object) => {
      mutateShippingMethod(omitUndefined({ data, optionId }))
    }

    const setShippingMethodAsync = async (optionId: string, data?: object) =>
      await mutateShippingMethodAsync(omitUndefined({ data, optionId }))

    const selectedShippingMethodId =
      effectiveCart?.shipping_methods?.[0]?.shipping_option_id
    const selectedShippingMethodData =
      effectiveCart?.shipping_methods?.[0]?.data
    const selectedOption = shippingOptions.find(
      (option) => option.id === selectedShippingMethodId,
    )

    return omitUndefined({
      isCalculating: calculatedQueries.some((query) => query.isFetching),
      isFetching,
      isLoading: false,
      isSettingShipping,
      selectedOption,
      selectedShippingMethodData,
      selectedShippingMethodId,
      setShippingMethod,
      setShippingMethodAsync,
      shippingOptions,
      shippingPrices,
    })
  }

  const useCheckoutPayment = <TPaymentContext = unknown>(
    input: CheckoutPaymentHookInput<TCart>,
    options?: CheckoutMutationOptions<
      TPaymentCollection,
      string,
      TPaymentContext
    >,
  ): UseCheckoutPaymentResult<TPaymentProvider, TPaymentCollection> => {
    const { cartId } = input
    const effectiveCart = useReactiveCart(input.cart, cartId)
    const resolvedCartId = cartId ?? effectiveCart?.id
    const regionId = input.regionId ?? effectiveCart?.region_id
    const enabled = input.enabled ?? Boolean(regionId)

    const paymentProvidersQueryOptions =
      regionId !== undefined && regionId !== null && regionId.length > 0
        ? getPaymentProvidersQueryOptions(regionId)
        : {
            queryFn: () => [] as TPaymentProvider[],
            queryKey: resolvedQueryKeys.paymentProviders("unknown"),
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
    const canInitiatePayment =
      resolvedCartId !== undefined &&
      resolvedCartId.length > 0 &&
      paymentState.hasShippingMethod

    return {
      canInitiatePayment,
      hasPaymentCollection: paymentState.hasPaymentCollection,
      hasPaymentSessions: paymentState.hasPaymentSessions,
      initiatePayment,
      initiatePaymentAsync,
      isFetching,
      isInitiatingPayment,
      isLoading,
      paymentProviders,
    }
  }

  const useSuspenseCheckoutPayment = <TSuspensePaymentContext = unknown>(
    input: CheckoutPaymentSuspenseHookInput<TCart>,
    options?: CheckoutMutationOptions<
      TPaymentCollection,
      string,
      TSuspensePaymentContext
    >,
  ): UseCheckoutPaymentResult<TPaymentProvider, TPaymentCollection> => {
    const { cartId } = input
    const effectiveCart = useReactiveCart(input.cart, cartId)
    const resolvedCartId = cartId ?? effectiveCart?.id
    const regionId = input.regionId ?? effectiveCart?.region_id

    const paymentProvidersQueryOptions =
      regionId !== undefined && regionId !== null && regionId.length > 0
        ? getPaymentProvidersQueryOptions(regionId)
        : {
            queryFn: () => [] as TPaymentProvider[],
            queryKey: resolvedQueryKeys.paymentProviders("unknown"),
            ...resolvedCacheConfig.semiStatic,
          }
    const { data: paymentProviders, isFetching } = useSuspenseQuery(
      paymentProvidersQueryOptions,
    )

    const {
      mutate: initiatePayment,
      mutateAsync: initiatePaymentAsync,
      isPending: isInitiatingPayment,
    } = usePaymentMutation(resolvedCartId, options)
    const paymentState = resolvePaymentState(effectiveCart)
    const canInitiatePayment =
      resolvedCartId !== undefined &&
      resolvedCartId.length > 0 &&
      paymentState.hasShippingMethod

    return {
      canInitiatePayment,
      hasPaymentCollection: paymentState.hasPaymentCollection,
      hasPaymentSessions: paymentState.hasPaymentSessions,
      initiatePayment,
      initiatePaymentAsync,
      isFetching,
      isInitiatingPayment,
      isLoading: false,
      paymentProviders,
    }
  }

  return {
    fetchPaymentProviders,
    getPaymentProvidersQueryOptions,
    useCheckoutPayment,
    useCheckoutShipping,
    useSuspenseCheckoutPayment,
    useSuspenseCheckoutShipping,
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
