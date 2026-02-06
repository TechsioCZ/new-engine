import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryClient,
  useSuspenseQueries,
  useSuspenseQuery,
} from "@tanstack/react-query"
import type { CartQueryKeys } from "../cart/types"
import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
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

export type { CheckoutMutationOptions }

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
> = Omit<CheckoutShippingHookInput<TCart, TShippingOption>, "enabled" | "cartId"> & {
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
  TPaymentCollection,
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
  TPaymentCollection,
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

  async function fetchPaymentProviders(
    queryClient: QueryClient,
    regionId: string
  ) {
    return queryClient.fetchQuery(getPaymentProvidersQueryOptions(regionId))
  }

  function useCheckoutShipping<TContext = unknown>(
    input: CheckoutShippingHookInput<TCart, TShippingOption>,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: Record<string, unknown> },
      TContext
    >
  ): UseCheckoutShippingResult<TShippingOption, TCart> {
    const queryClient = useQueryClient()
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

    const shouldCalculate =
      Boolean(cartId) &&
      calculatePrices &&
      typeof service.calculateShippingOption === "function"
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
                service.calculateShippingOption?.(
                  option.id,
                  {
                    cart_id: cartIdValue,
                    data,
                  },
                  signal
                ) as Promise<TShippingOption>,
              enabled,
              ...resolvedCacheConfig.realtime,
            }
          })
        : [],
    })

    const calculatedById = new Map<string, TShippingOption>()
    for (const [index, query] of calculatedQueries.entries()) {
      const option = calculatedOptions[index]
      if (!(option && query.data)) {
        continue
      }
      calculatedById.set(option.id, query.data)
    }

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

    const {
      mutate: mutateShippingMethod,
      mutateAsync: mutateShippingMethodAsync,
      isPending: isSettingShipping,
    } = useMutation({
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
        onMutate: async (variables) => {
          return options?.onMutate?.(variables)
        },
        onSuccess: (cart, variables, context) => {
          if (cartQueryKeys) {
            queryClient.setQueryData(
              cartQueryKeys.active({
                cartId: cart.id,
                regionId: cart.region_id ?? null,
              }),
              cart
            )
          }
          options?.onSuccess?.(cart, variables, context as TContext)
        },
        onError: (error, variables, context) => {
          options?.onError?.(error, variables, context as TContext | undefined)
        },
        onSettled: (data, error, variables, context) => {
          options?.onSettled?.(
            data,
            error,
            variables,
            context as TContext | undefined
          )
        },
      })

    const setShippingMethod = (
      optionId: string,
      data?: Record<string, unknown>
    ) => {
      mutateShippingMethod({ optionId, data })
    }

    const setShippingMethodAsync = async (
      optionId: string,
      data?: Record<string, unknown>
    ) => {
      return mutateShippingMethodAsync({ optionId, data })
    }

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
    const queryClient = useQueryClient()
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

    const shouldCalculate =
      calculatePrices && typeof service.calculateShippingOption === "function"

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
                service.calculateShippingOption?.(
                  option.id,
                  {
                    cart_id: cartId,
                    data,
                  },
                  signal
                ) as Promise<TShippingOption>,
              ...resolvedCacheConfig.realtime,
            }
          })
        : [],
    })

    const calculatedById = new Map<string, TShippingOption>()
    for (const [index, query] of calculatedQueries.entries()) {
      const option = calculatedOptions[index]
      if (!(option && query.data)) {
        continue
      }
      calculatedById.set(option.id, query.data)
    }

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

    const {
      mutate: mutateShippingMethod,
      mutateAsync: mutateShippingMethodAsync,
      isPending: isSettingShipping,
    } = useMutation({
        mutationFn: ({
          optionId,
          data,
        }: {
          optionId: string
          data?: Record<string, unknown>
        }) => service.addShippingMethod(cartId, optionId, data),
        onMutate: async (variables) => {
          return options?.onMutate?.(variables)
        },
        onSuccess: (cart, variables, context) => {
          if (cartQueryKeys) {
            queryClient.setQueryData(
              cartQueryKeys.active({
                cartId: cart.id,
                regionId: cart.region_id ?? null,
              }),
              cart
            )
          }
          options?.onSuccess?.(cart, variables, context as TContext)
        },
        onError: (error, variables, context) => {
          options?.onError?.(error, variables, context as TContext | undefined)
        },
        onSettled: (data, error, variables, context) => {
          options?.onSettled?.(
            data,
            error,
            variables,
            context as TContext | undefined
          )
        },
      })

    const setShippingMethod = (
      optionId: string,
      data?: Record<string, unknown>
    ) => {
      mutateShippingMethod({ optionId, data })
    }

    const setShippingMethodAsync = async (
      optionId: string,
      data?: Record<string, unknown>
    ) => {
      return mutateShippingMethodAsync({ optionId, data })
    }

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
    options?: CheckoutMutationOptions<TPaymentCollection, string, TPaymentContext>
  ): UseCheckoutPaymentResult<TPaymentProvider, TPaymentCollection> {
    const queryClient = useQueryClient()
    const cartId = input.cartId
    const regionId = input.regionId ?? input.cart?.region_id ?? undefined
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
    } = useMutation({
        mutationFn: (providerId: string) => {
          if (!cartId) {
            throw new Error("Cart id is required")
          }
          return service.initiatePaymentSession(cartId, providerId)
        },
        onMutate: async (variables) => {
          return options?.onMutate?.(variables)
        },
        onSuccess: (data, variables, context) => {
          if (cartQueryKeys) {
            queryClient.invalidateQueries({
              queryKey: cartQueryKeys.all(),
            })
          }
          options?.onSuccess?.(data, variables, context as TPaymentContext)
        },
        onError: (error, variables, context) => {
          options?.onError?.(
            error,
            variables,
            context as TPaymentContext | undefined
          )
        },
        onSettled: (data, error, variables, context) => {
          options?.onSettled?.(
            data,
            error,
            variables,
            context as TPaymentContext | undefined
          )
        },
      })

    const hasShippingMethod = (input.cart?.shipping_methods?.length ?? 0) > 0
    const canInitiatePayment = Boolean(cartId && hasShippingMethod)
    const hasPaymentCollection = Boolean(input.cart?.payment_collection)
    const hasPaymentSessions =
      (input.cart?.payment_collection?.payment_sessions?.length ?? 0) > 0

    return {
      paymentProviders,
      initiatePayment,
      initiatePaymentAsync: async (providerId: string) => {
        return initiatePaymentAsync(providerId)
      },
      isInitiatingPayment,
      isLoading,
      isFetching,
      canInitiatePayment,
      hasPaymentCollection,
      hasPaymentSessions,
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
    const queryClient = useQueryClient()
    const cartId = input.cartId
    const regionId = input.regionId ?? input.cart?.region_id ?? undefined
    if (!regionId) {
      throw new Error("Region id is required for checkout payment")
    }

    const { data: paymentProviders, isFetching } = useSuspenseQuery(
      getPaymentProvidersQueryOptions(regionId)
    )

    const {
      mutate: initiatePayment,
      mutateAsync: initiatePaymentAsync,
      isPending: isInitiatingPayment,
    } = useMutation({
        mutationFn: (providerId: string) => {
          if (!cartId) {
            throw new Error("Cart id is required")
          }
          return service.initiatePaymentSession(cartId, providerId)
        },
        onMutate: async (variables) => {
          return options?.onMutate?.(variables)
        },
        onSuccess: (data, variables, context) => {
          if (cartQueryKeys) {
            queryClient.invalidateQueries({
              queryKey: cartQueryKeys.all(),
            })
          }
          options?.onSuccess?.(
            data,
            variables,
            context as TSuspensePaymentContext
          )
        },
        onError: (error, variables, context) => {
          options?.onError?.(
            error,
            variables,
            context as TSuspensePaymentContext | undefined
          )
        },
        onSettled: (data, error, variables, context) => {
          options?.onSettled?.(
            data,
            error,
            variables,
            context as TSuspensePaymentContext | undefined
          )
        },
      })

    const hasShippingMethod = (input.cart?.shipping_methods?.length ?? 0) > 0
    const canInitiatePayment = Boolean(cartId && hasShippingMethod)
    const hasPaymentCollection = Boolean(input.cart?.payment_collection)
    const hasPaymentSessions =
      (input.cart?.payment_collection?.payment_sessions?.length ?? 0) > 0

    return {
      paymentProviders,
      initiatePayment,
      initiatePaymentAsync: async (providerId: string) => {
        return initiatePaymentAsync(providerId)
      },
      isInitiatingPayment,
      isLoading: false,
      isFetching,
      canInitiatePayment,
      hasPaymentCollection,
      hasPaymentSessions,
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
