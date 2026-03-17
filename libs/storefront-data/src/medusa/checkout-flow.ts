import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { QueryClient } from "@tanstack/react-query"
import type { MedusaCompleteCartResult } from "../cart/medusa-service"
import type { StorageValueStore } from "../shared/browser-storage"
import {
  type ActiveCartQueryKeyMatcher,
  getCachedCartById,
} from "../shared/cart-cache-sync"
import {
  resolveCheckoutCartInput,
  resolveEffectiveCheckoutCart,
  resolveExistingPaymentCollection,
  resolveSelectedPaymentProviderId,
} from "../shared/checkout-flow-utils"
import { createErrorWithStage } from "../shared/error-utils"
import {
  createMedusaCartFlow,
  type MedusaCartFlowStorefront,
} from "./cart-flow"

type MedusaCheckoutShippingHook = (
  input: {
    cartId?: string
    cart?: HttpTypes.StoreCart | null
    enabled?: boolean
    calculatePrices?: boolean
  },
  options?: {
    onSuccess?: (cart: HttpTypes.StoreCart) => void
    onError?: (error: unknown) => void
  }
 ) => {
  shippingOptions: HttpTypes.StoreCartShippingOption[]
  shippingPrices: Record<string, number>
  isLoading: boolean
  isFetching: boolean
  isCalculating: boolean
  setShippingMethod: (optionId: string, data?: Record<string, unknown>) => void
  isSettingShipping: boolean
  selectedShippingMethodId?: string
  selectedOption?: HttpTypes.StoreCartShippingOption
}

type MedusaCheckoutPaymentHook = (
  input: {
    cartId?: string
    regionId?: string
    cart?: HttpTypes.StoreCart | null
    enabled?: boolean
  },
  options?: {
    onSuccess?: (paymentCollection: HttpTypes.StorePaymentCollection) => void
    onError?: (error: unknown) => void
  }
 ) => {
  paymentProviders: HttpTypes.StorePaymentProvider[]
  initiatePayment: (providerId: string) => void
  initiatePaymentAsync: (
    providerId: string
  ) => Promise<HttpTypes.StorePaymentCollection>
  isInitiatingPayment: boolean
  isLoading: boolean
  isFetching: boolean
  canInitiatePayment: boolean
  hasPaymentCollection: boolean
  hasPaymentSessions: boolean
}

export type MedusaCheckoutFlowStorefront = MedusaCartFlowStorefront & {
  hooks: MedusaCartFlowStorefront["hooks"] & {
    checkout: {
      useCheckoutShipping: MedusaCheckoutShippingHook
      useCheckoutPayment: MedusaCheckoutPaymentHook
      fetchPaymentProviders: (
        queryClient: QueryClient,
        regionId: string
      ) => Promise<HttpTypes.StorePaymentProvider[]>
    }
  }
}

export type MedusaShippingMethodData = Record<string, unknown>

export type UseMedusaCheckoutShippingOptions = {
  enabled?: boolean
  calculatePrices?: boolean
  onSuccess?: (cart: HttpTypes.StoreCart) => void
  onError?: (error: unknown) => void
  normalizeShippingData?: (
    data?: MedusaShippingMethodData
  ) => Record<string, unknown> | undefined
}

export type UseMedusaCheckoutShippingReturn = {
  shippingOptions: HttpTypes.StoreCartShippingOption[]
  shippingPrices: Record<string, number>
  isLoading: boolean
  isFetching: boolean
  isCalculating: boolean
  setShipping: (
    optionId: string,
    data?: MedusaShippingMethodData
  ) => void
  isSettingShipping: boolean
  canLoadShipping: boolean
  canSetShipping: boolean
  selectedShippingMethodId?: string
  selectedOption?: HttpTypes.StoreCartShippingOption
}

export type UseMedusaCheckoutPaymentOptions = {
  enabled?: boolean
  onSuccess?: (paymentCollection: HttpTypes.StorePaymentCollection) => void
  onError?: (error: unknown) => void
}

export type UseMedusaCheckoutPaymentReturn = {
  paymentProviders: HttpTypes.StorePaymentProvider[]
  initiatePayment: (providerId: string) => void
  initiatePaymentAsync: (
    providerId: string
  ) => Promise<HttpTypes.StorePaymentCollection>
  isInitiatingPayment: boolean
  isLoading: boolean
  isFetching: boolean
  canInitiatePayment: boolean
  hasPaymentCollection: boolean
  hasPaymentSessions: boolean
}

export type CreateMedusaCheckoutFlowConfig = {
  storefront: MedusaCheckoutFlowStorefront
  cartStorage?: StorageValueStore
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher
}

export type UseMedusaCompleteCheckoutInput = {
  cartId?: string
  cart?: HttpTypes.StoreCart | null
  regionId?: string
  enabled?: boolean
}

export type MedusaCompleteCheckoutRequest = {
  paymentProviderId?: string
}

export type MedusaCompleteCheckoutStage =
  | "cart"
  | "payment_provider"
  | "payment"
  | "complete"

export type MedusaCompleteCheckoutError = {
  stage: MedusaCompleteCheckoutStage
  message: string
  cause?: unknown
}

export type MedusaCompleteCheckoutSuccess = {
  order: HttpTypes.StoreOrder
  paymentCollection: HttpTypes.StorePaymentCollection
  paymentProviderId: string
}

export type ResolvePaymentProviderContext = {
  cart?: HttpTypes.StoreCart | null
  existingPaymentProviderId?: string
  paymentProviders: HttpTypes.StorePaymentProvider[]
  requestedPaymentProviderId?: string
}

export type UseMedusaCompleteCheckoutOptions = {
  resolvePaymentProviderId?: (
    context: ResolvePaymentProviderContext
  ) => string | null | undefined
  onSuccess?: (result: MedusaCompleteCheckoutSuccess) => void
  onError?: (error: MedusaCompleteCheckoutError) => void
}


const defaultNormalizeShippingData = (
  data?: MedusaShippingMethodData
): Record<string, unknown> | undefined => {
  if (!data) {
    return 
  }

  const entries = Object.entries(data).filter(
    ([, value]) => value != null && value !== ""
  )

  if (entries.length === 0) {
    return 
  }

  return Object.fromEntries(entries)
}

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 
  }

  return value as Record<string, unknown>
}

const toComparableShippingData = (data?: Record<string, unknown>): string =>
  JSON.stringify(
    Object.entries(data ?? {})
      .filter(([, value]) => value != null && value !== "")
      .sort(([left], [right]) => left.localeCompare(right))
  )

const isSameShippingSelection = ({
  selectedOptionId,
  nextOptionId,
  nextData,
  currentData,
}: {
  selectedOptionId?: string
  nextOptionId: string
  nextData?: Record<string, unknown>
  currentData?: unknown
}): boolean => {
  if (selectedOptionId !== nextOptionId) {
    return false
  }

  return (
    toComparableShippingData(nextData) ===
    toComparableShippingData(toRecord(currentData))
  )
}


const defaultResolvePaymentProviderId = ({
  requestedPaymentProviderId,
  existingPaymentProviderId,
  paymentProviders,
}: ResolvePaymentProviderContext): string | null =>
  requestedPaymentProviderId ??
  existingPaymentProviderId ??
  paymentProviders[0]?.id ??
  null

const resolvePaymentProviderSelection = (
  context: ResolvePaymentProviderContext,
  resolvePaymentProviderId?: (
    resolveContext: ResolvePaymentProviderContext
  ) => string | null | undefined
): {
  paymentProviderId: string | null
  wasExplicit: boolean
} => {
  const resolvedPaymentProviderId = resolvePaymentProviderId?.(context)
  if (resolvedPaymentProviderId !== undefined) {
    return {
      paymentProviderId: resolvedPaymentProviderId,
      wasExplicit: true,
    }
  }

  return {
    paymentProviderId: defaultResolvePaymentProviderId(context),
    wasExplicit: false,
  }
}

export function createMedusaCheckoutFlow({
  storefront,
  cartStorage,
  isActiveCartQueryKey,
}: CreateMedusaCheckoutFlowConfig) {
  const checkoutHooks = storefront.hooks.checkout
  const cartFlow = createMedusaCartFlow({
    storefront,
    cartStorage,
    isActiveCartQueryKey,
  })

  const resolveEffectiveCart = ({
    queryClient,
    cartId,
    cart,
  }: {
    queryClient: QueryClient
    cartId: string
    cart?: HttpTypes.StoreCart | null
  }): HttpTypes.StoreCart | null =>
    resolveEffectiveCheckoutCart({
      cartId,
      cart,
      getCachedCart: (effectiveCartId) =>
        getCachedCartById<HttpTypes.StoreCart>(
          queryClient,
          storefront.queryKeys.cart,
          effectiveCartId,
          { isActiveCartQueryKey }
        ),
    })

  function useCheckoutShipping(
    cartId?: string,
    cart?: HttpTypes.StoreCart | null,
    options?: UseMedusaCheckoutShippingOptions
  ): UseMedusaCheckoutShippingReturn {
    const queryClient = useQueryClient()
    const { resolvedCartId, normalizedCart } = resolveCheckoutCartInput({
      cartId,
      cart,
    })
    const normalizeShippingData =
      options?.normalizeShippingData ?? defaultNormalizeShippingData
    const canLoadShipping = Boolean(resolvedCartId)
    const effectiveCart = resolvedCartId
      ? resolveEffectiveCart({
          queryClient,
          cartId: resolvedCartId,
          cart: normalizedCart,
        })
      : normalizedCart ?? null
    const shipping = checkoutHooks.useCheckoutShipping(
      {
        cartId: resolvedCartId,
        cart: effectiveCart,
        enabled: options?.enabled ?? canLoadShipping,
        calculatePrices: options?.calculatePrices,
      },
      {
        onSuccess: (updatedCart: HttpTypes.StoreCart) => {
          options?.onSuccess?.(updatedCart)
        },
        onError: (error: unknown) => {
          options?.onError?.(error)
        },
      }
    )

    const setShipping = (optionId: string, data?: MedusaShippingMethodData) => {
      const cleanedData = normalizeShippingData(data)
      const currentData = effectiveCart?.shipping_methods?.find(
        (method) => method.shipping_option_id === optionId
      )?.data

      if (
        isSameShippingSelection({
          selectedOptionId: shipping.selectedShippingMethodId,
          nextOptionId: optionId,
          nextData: cleanedData,
          currentData,
        })
      ) {
        return
      }

      shipping.setShippingMethod(optionId, cleanedData)
    }

    const {
      shippingOptions,
      shippingPrices,
      isLoading,
      isFetching,
      isCalculating,
      isSettingShipping,
      selectedShippingMethodId,
      selectedOption,
    } = shipping

    return {
      shippingOptions,
      shippingPrices,
      isLoading,
      isFetching,
      isCalculating,
      setShipping,
      isSettingShipping,
      canLoadShipping,
      canSetShipping: shippingOptions.length > 0,
      selectedShippingMethodId,
      selectedOption,
    }
  }

  function useCheckoutPayment(
    cartId?: string,
    regionId?: string,
    cart?: HttpTypes.StoreCart | null,
    options?: UseMedusaCheckoutPaymentOptions
  ): UseMedusaCheckoutPaymentReturn {
    const { resolvedCartId, normalizedCart } = resolveCheckoutCartInput({
      cartId,
      cart,
    })
    const payment = checkoutHooks.useCheckoutPayment(
      {
        cartId: resolvedCartId,
        regionId,
        cart: normalizedCart,
        enabled: options?.enabled ?? Boolean(resolvedCartId),
      },
      {
        onSuccess: (paymentCollection: HttpTypes.StorePaymentCollection) => {
          options?.onSuccess?.(paymentCollection)
        },
        onError: (error: unknown) => {
          options?.onError?.(error)
        },
      }
    )
    const {
      paymentProviders,
      initiatePayment,
      initiatePaymentAsync,
      isInitiatingPayment,
      isLoading,
      isFetching,
      canInitiatePayment,
      hasPaymentCollection,
      hasPaymentSessions,
    } = payment

    return {
      paymentProviders,
      initiatePayment,
      initiatePaymentAsync,
      isInitiatingPayment,
      isLoading,
      isFetching,
      canInitiatePayment,
      hasPaymentCollection,
      hasPaymentSessions,
    }
  }
  const resolveCheckoutPaymentProviderId = async ({
    effectiveCart,
    effectiveRegionId,
    requestedPaymentProviderId,
    paymentProviders,
    resolvePaymentProviderId,
    queryClient,
  }: {
    effectiveCart: HttpTypes.StoreCart | null
    effectiveRegionId?: string
    requestedPaymentProviderId?: string
    paymentProviders: HttpTypes.StorePaymentProvider[]
    resolvePaymentProviderId?: UseMedusaCompleteCheckoutOptions["resolvePaymentProviderId"]
    queryClient: QueryClient
  }): Promise<string> => {
    const existingPaymentProviderId =
      resolveSelectedPaymentProviderId(effectiveCart)
    const initialSelection = resolvePaymentProviderSelection(
      {
        cart: effectiveCart,
        existingPaymentProviderId,
        paymentProviders,
        requestedPaymentProviderId,
      },
      resolvePaymentProviderId
    )
    if (initialSelection.paymentProviderId != null) {
      return initialSelection.paymentProviderId
    }
    if (initialSelection.wasExplicit || !effectiveRegionId) {
      throw new Error("No payment provider available")
    }

    const refreshedPaymentProviders = await checkoutHooks.fetchPaymentProviders(
      queryClient,
      effectiveRegionId
    )
    const refreshedSelection = resolvePaymentProviderSelection(
      {
        cart: effectiveCart,
        existingPaymentProviderId,
        paymentProviders: refreshedPaymentProviders,
        requestedPaymentProviderId,
      },
      resolvePaymentProviderId
    )
    if (!refreshedSelection.paymentProviderId) {
      throw new Error("No payment provider available")
    }
    return refreshedSelection.paymentProviderId
  }

  const ensureCheckoutPaymentCollection = ({
    effectiveCart,
    paymentProviderId,
    initiatePaymentAsync,
  }: {
    effectiveCart: HttpTypes.StoreCart | null
    paymentProviderId: string
    initiatePaymentAsync: (
      providerId: string
    ) => Promise<HttpTypes.StorePaymentCollection>
  }): Promise<HttpTypes.StorePaymentCollection> => {
    const existingPaymentCollection = resolveExistingPaymentCollection(
      effectiveCart,
      paymentProviderId
    )
    if (existingPaymentCollection) {
      return Promise.resolve(existingPaymentCollection)
    }
    return initiatePaymentAsync(paymentProviderId)
  }

  const completeCheckoutOrder = async ({
    cartId,
    completeCartMutation,
  }: {
    cartId: string
    completeCartMutation: (
      input: { cartId?: string }
    ) => Promise<MedusaCompleteCartResult>
  }): Promise<HttpTypes.StoreOrder> => {
    const result = await completeCartMutation({ cartId })
    if (result.type !== "order") {
      throw result.error
    }
    return result.order
  }

  function useCompleteCheckout(
    input: UseMedusaCompleteCheckoutInput,
    options?: UseMedusaCompleteCheckoutOptions
  ) {
    const queryClient = useQueryClient()
    const { resolvedCartId, normalizedCart } = resolveCheckoutCartInput({
      cartId: input.cartId,
      cart: input.cart,
    })
    const payment = useCheckoutPayment(
      resolvedCartId,
      input.regionId,
      normalizedCart,
      {
        enabled: input.enabled ?? Boolean(resolvedCartId),
      }
    )
    const completeCart = cartFlow.useCompleteCart()
    const { paymentProviders, initiatePaymentAsync } = payment
    const { mutateAsync: completeCartAsync } = completeCart
    const resolvePaymentProviderId = options?.resolvePaymentProviderId

    return useMutation<
      MedusaCompleteCheckoutSuccess,
      MedusaCompleteCheckoutError,
      MedusaCompleteCheckoutRequest | undefined
>({
      mutationFn: async (request) => {
        const { resolvedCartId: mutationCartId, normalizedCart: mutationCart } =
          resolveCheckoutCartInput({
            cartId: input.cartId,
            cart: input.cart,
          })
        if (!mutationCartId) {
          throw createErrorWithStage<MedusaCompleteCheckoutStage>(
            "cart",
            "Cart id is required"
          )
        }

        const effectiveCart = resolveEffectiveCart({
          queryClient,
          cartId: mutationCartId,
          cart: mutationCart,
        })
        const effectiveRegionId =
          input.regionId ?? effectiveCart?.region_id ?? undefined

        let paymentProviderId: string
        try {
          paymentProviderId = await resolveCheckoutPaymentProviderId({
            effectiveCart,
            effectiveRegionId,
            requestedPaymentProviderId: request?.paymentProviderId,
            paymentProviders,
            resolvePaymentProviderId,
            queryClient,
          })
        } catch (error) {
          throw createErrorWithStage<MedusaCompleteCheckoutStage>(
            "payment_provider",
            "Failed to resolve payment provider",
            error
          )
        }

        let paymentCollection: HttpTypes.StorePaymentCollection
        try {
          paymentCollection = await ensureCheckoutPaymentCollection({
            effectiveCart,
            paymentProviderId,
            initiatePaymentAsync,
          })
        } catch (error) {
          throw createErrorWithStage<MedusaCompleteCheckoutStage>(
            "payment",
            "Failed to initiate payment",
            error
          )
        }

        let order: HttpTypes.StoreOrder
        try {
          order = await completeCheckoutOrder({
            cartId: mutationCartId,
            completeCartMutation: completeCartAsync,
          })
        } catch (error) {
          throw createErrorWithStage<MedusaCompleteCheckoutStage>(
            "complete",
            "Failed to complete checkout",
            error
          )
        }

        return {
          order,
          paymentCollection,
          paymentProviderId,
        }
      },
      onSuccess: (result) => {
        options?.onSuccess?.(result)
      },
      onError: (error) => {
        options?.onError?.(error)
      },
    })
  }

  return {
    useCheckoutShipping,
    useCheckoutPayment,
    useCompleteCheckout,
  }
}
