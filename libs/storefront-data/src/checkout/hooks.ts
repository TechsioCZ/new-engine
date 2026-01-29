import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { CartQueryKeys } from "../cart/types"
import { type CacheConfig, createCacheConfig } from "../shared/cache-config"
import type { QueryNamespace } from "../shared/query-keys"
import { createCheckoutQueryKeys } from "./query-keys"
import type {
  CheckoutCartLike,
  CheckoutPaymentInputBase,
  CheckoutQueryKeys,
  CheckoutService,
  CheckoutShippingInputBase,
  ShippingOptionLike,
  UseCheckoutPaymentResult,
  UseCheckoutShippingResult,
} from "./types"

export type CheckoutMutationOptions<TData, TVariables> = {
  onSuccess?: (data: TData, variables: TVariables) => void
  onError?: (error: unknown) => void
}

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

  function useCheckoutShipping(
    input: CheckoutShippingHookInput<TCart, TShippingOption>,
    options?: CheckoutMutationOptions<
      TCart,
      { optionId: string; data?: Record<string, unknown> }
    >
  ): UseCheckoutShippingResult<TShippingOption> {
    const queryClient = useQueryClient()
    const cartId = input.cartId
    const enabled = input.enabled ?? Boolean(cartId)
    const calculatePrices = input.calculatePrices ?? true

    const {
      data: shippingOptions = [],
      isLoading,
      isFetching,
    } = useQuery({
      queryKey: resolvedQueryKeys.shippingOptions(cartId ?? "unknown"),
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

    const { mutate: mutateShippingMethod, isPending: isSettingShipping } =
      useMutation({
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
        onSuccess: (cart, variables) => {
          if (cartQueryKeys) {
            queryClient.setQueryData(
              cartQueryKeys.active({
                cartId: cart.id,
                regionId: cart.region_id ?? null,
              }),
              cart
            )
          }
          options?.onSuccess?.(cart, variables)
        },
        onError: (error) => {
          options?.onError?.(error)
        },
      })

    const setShippingMethod = (
      optionId: string,
      data?: Record<string, unknown>
    ) => {
      mutateShippingMethod({ optionId, data })
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
      isSettingShipping,
      selectedShippingMethodId,
      selectedOption,
    }
  }

  function useCheckoutPayment(
    input: CheckoutPaymentHookInput<TCart>,
    options?: CheckoutMutationOptions<TPaymentCollection, string>
  ): UseCheckoutPaymentResult<TPaymentProvider> {
    const queryClient = useQueryClient()
    const cartId = input.cartId
    const regionId = input.regionId ?? input.cart?.region_id ?? undefined
    const enabled = input.enabled ?? Boolean(regionId)

    const {
      data: paymentProviders = [],
      isLoading,
      isFetching,
    } = useQuery({
      queryKey: resolvedQueryKeys.paymentProviders(regionId ?? "unknown"),
      queryFn: ({ signal }) => {
        if (!regionId) {
          return []
        }
        return service.listPaymentProviders(regionId, signal)
      },
      enabled,
      ...resolvedCacheConfig.semiStatic,
    })

    const { mutate: initiatePayment, isPending: isInitiatingPayment } =
      useMutation({
        mutationFn: (providerId: string) => {
          if (!cartId) {
            throw new Error("Cart id is required")
          }
          return service.initiatePaymentSession(cartId, providerId)
        },
        onSuccess: (data, variables) => {
          if (cartQueryKeys) {
            queryClient.invalidateQueries({
              queryKey: cartQueryKeys.all(),
            })
          }
          options?.onSuccess?.(data, variables)
        },
        onError: (error) => {
          options?.onError?.(error)
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
      isInitiatingPayment,
      isLoading,
      isFetching,
      canInitiatePayment,
      hasPaymentCollection,
      hasPaymentSessions,
    }
  }

  return {
    useCheckoutShipping,
    useCheckoutPayment,
  }
}
