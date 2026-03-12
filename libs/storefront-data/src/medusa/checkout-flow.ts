import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import type { ActiveCartQueryKeyMatcher } from "../cart/cache-sync"
import type { CartStorage } from "../cart/types"
import type { MedusaCompleteCartResult } from "../cart/medusa-service"
import { createMedusaCartFlow } from "./cart-flow"
import type { MedusaStorefrontPreset } from "./preset"

type MedusaCheckoutFlowStorefront = {
  hooks: {
    cart: {
      useCart: MedusaStorefrontPreset["hooks"]["cart"]["useCart"]
      useSuspenseCart: MedusaStorefrontPreset["hooks"]["cart"]["useSuspenseCart"]
      useAddLineItem: MedusaStorefrontPreset["hooks"]["cart"]["useAddLineItem"]
      useUpdateLineItem: MedusaStorefrontPreset["hooks"]["cart"]["useUpdateLineItem"]
      useRemoveLineItem: MedusaStorefrontPreset["hooks"]["cart"]["useRemoveLineItem"]
      useCompleteCart: MedusaStorefrontPreset["hooks"]["cart"]["useCompleteCart"]
    }
    checkout: {
      useCheckoutShipping: MedusaStorefrontPreset["hooks"]["checkout"]["useCheckoutShipping"]
      useCheckoutPayment: MedusaStorefrontPreset["hooks"]["checkout"]["useCheckoutPayment"]
      fetchPaymentProviders: MedusaStorefrontPreset["hooks"]["checkout"]["fetchPaymentProviders"]
    }
  }
  queryKeys: {
    cart: MedusaStorefrontPreset["queryKeys"]["cart"]
    checkout: MedusaStorefrontPreset["queryKeys"]["checkout"]
    orders: MedusaStorefrontPreset["queryKeys"]["orders"]
  }
  services: {
    cart: {
      retrieveCart: MedusaStorefrontPreset["services"]["cart"]["retrieveCart"]
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
  cartStorage?: CartStorage
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

const resolveExistingPaymentCollection = (
  cart: HttpTypes.StoreCart | null | undefined,
  paymentProviderId: string
): HttpTypes.StorePaymentCollection | null => {
  const paymentCollection = cart?.payment_collection
  const paymentSessions = paymentCollection?.payment_sessions
  if (!paymentCollection || !paymentSessions?.length) {
    return null
  }

  const matchingSession = paymentSessions.find(
    (session) => session.provider_id === paymentProviderId
  )

  return matchingSession ? paymentCollection : null
}

const defaultNormalizeShippingData = (
  data?: MedusaShippingMethodData
): Record<string, unknown> | undefined => {
  if (!data) {
    return undefined
  }

  const entries = Object.entries(data).filter(
    ([, value]) => value != null && value !== ""
  )

  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(entries)
}

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
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

const toErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message
  }

  if (typeof error === "string" && error.length > 0) {
    return error
  }

  return fallback
}

const createCompleteCheckoutError = (
  stage: MedusaCompleteCheckoutStage,
  cause: unknown,
  fallback: string
): MedusaCompleteCheckoutError => ({
  stage,
  message: toErrorMessage(cause, fallback),
  cause,
})

const defaultResolvePaymentProviderId = ({
  requestedPaymentProviderId,
  existingPaymentProviderId,
  paymentProviders,
}: ResolvePaymentProviderContext): string | null =>
  requestedPaymentProviderId ??
  existingPaymentProviderId ??
  paymentProviders[0]?.id ??
  null

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

  function useCheckoutShipping(
    cartId?: string,
    cart?: HttpTypes.StoreCart | null,
    options?: UseMedusaCheckoutShippingOptions
  ): UseMedusaCheckoutShippingReturn {
    const normalizeShippingData =
      options?.normalizeShippingData ?? defaultNormalizeShippingData
    const canLoadShipping = Boolean(cartId && (cart?.items?.length ?? 0) > 0)

    const shipping = checkoutHooks.useCheckoutShipping(
      {
        cartId,
        cart,
        enabled: options?.enabled ?? canLoadShipping,
        calculatePrices: options?.calculatePrices,
      },
      {
        onSuccess: (updatedCart) => {
          options?.onSuccess?.(updatedCart)
        },
        onError: (error) => {
          options?.onError?.(error)
        },
      }
    )

    const setShipping = useCallback(
      (optionId: string, data?: MedusaShippingMethodData) => {
        const cleanedData = normalizeShippingData(data)
        const currentData = cart?.shipping_methods?.find(
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
      },
      [
        cart?.shipping_methods,
        normalizeShippingData,
        shipping.selectedShippingMethodId,
        shipping.setShippingMethod,
      ]
    )

    return {
      shippingOptions: shipping.shippingOptions,
      shippingPrices: shipping.shippingPrices,
      isLoading: shipping.isLoading,
      isFetching: shipping.isFetching,
      isCalculating: shipping.isCalculating,
      setShipping,
      isSettingShipping: shipping.isSettingShipping,
      canLoadShipping,
      canSetShipping: shipping.shippingOptions.length > 0,
      selectedShippingMethodId: shipping.selectedShippingMethodId,
      selectedOption: shipping.selectedOption,
    }
  }

  function useCheckoutPayment(
    cartId?: string,
    regionId?: string,
    cart?: HttpTypes.StoreCart | null,
    options?: UseMedusaCheckoutPaymentOptions
  ): UseMedusaCheckoutPaymentReturn {
    const payment = checkoutHooks.useCheckoutPayment(
      {
        cartId,
        regionId,
        cart,
        enabled: options?.enabled ?? Boolean(regionId ?? cart?.region_id),
      },
      {
        onSuccess: (paymentCollection) => {
          options?.onSuccess?.(paymentCollection)
        },
        onError: (error) => {
          options?.onError?.(error)
        },
      }
    )

    return {
      paymentProviders: payment.paymentProviders,
      initiatePayment: payment.initiatePayment,
      initiatePaymentAsync: payment.initiatePaymentAsync,
      isInitiatingPayment: payment.isInitiatingPayment,
      isLoading: payment.isLoading,
      isFetching: payment.isFetching,
      canInitiatePayment: payment.canInitiatePayment,
      hasPaymentCollection: payment.hasPaymentCollection,
      hasPaymentSessions: payment.hasPaymentSessions,
    }
  }

  function useCompleteCheckout(
    input: UseMedusaCompleteCheckoutInput,
    options?: UseMedusaCompleteCheckoutOptions
  ) {
    const queryClient = useQueryClient()
    const effectiveRegionId = input.regionId ?? input.cart?.region_id ?? undefined
    const payment = useCheckoutPayment(
      input.cartId,
      effectiveRegionId,
      input.cart,
      {
        enabled: input.enabled ?? Boolean(effectiveRegionId),
      }
    )
    const completeCart = cartFlow.useCompleteCart()

    return useMutation<
      MedusaCompleteCheckoutSuccess,
      MedusaCompleteCheckoutError,
      MedusaCompleteCheckoutRequest | undefined
    >({
      mutationFn: async (request) => {
        const cartId = input.cartId ?? input.cart?.id
        if (!cartId) {
          throw createCompleteCheckoutError(
            "cart",
            new Error("Cart id is required"),
            "Cart id is required"
          )
        }

        const existingPaymentProviderId =
          input.cart?.payment_collection?.payment_sessions?.[0]?.provider_id

        let paymentProviders = payment.paymentProviders
        let paymentProviderId: string | null | undefined

        try {
          paymentProviderId =
            options?.resolvePaymentProviderId?.({
              cart: input.cart,
              existingPaymentProviderId,
              paymentProviders,
              requestedPaymentProviderId: request?.paymentProviderId,
            }) ??
            defaultResolvePaymentProviderId({
              cart: input.cart,
              existingPaymentProviderId,
              paymentProviders,
              requestedPaymentProviderId: request?.paymentProviderId,
            })

          if (!paymentProviderId && effectiveRegionId) {
            paymentProviders = await checkoutHooks.fetchPaymentProviders(
              queryClient,
              effectiveRegionId
            )
            paymentProviderId =
              options?.resolvePaymentProviderId?.({
                cart: input.cart,
                existingPaymentProviderId,
                paymentProviders,
                requestedPaymentProviderId: request?.paymentProviderId,
              }) ??
              defaultResolvePaymentProviderId({
                cart: input.cart,
                existingPaymentProviderId,
                paymentProviders,
                requestedPaymentProviderId: request?.paymentProviderId,
              })
          }
        } catch (error) {
          throw createCompleteCheckoutError(
            "payment_provider",
            error,
            "Failed to resolve payment provider"
          )
        }

        if (!paymentProviderId) {
          throw createCompleteCheckoutError(
            "payment_provider",
            new Error("No payment provider available"),
            "No payment provider available"
          )
        }

        let paymentCollection =
          resolveExistingPaymentCollection(input.cart, paymentProviderId)
        try {
          if (!paymentCollection) {
            paymentCollection = await payment.initiatePaymentAsync(paymentProviderId)
          }
        } catch (error) {
          throw createCompleteCheckoutError(
            "payment",
            error,
            "Failed to initiate payment"
          )
        }

        let result: MedusaCompleteCartResult
        try {
          result = await completeCart.mutateAsync({ cartId })
        } catch (error) {
          throw createCompleteCheckoutError(
            "complete",
            error,
            "Failed to complete checkout"
          )
        }

        if (result.type !== "order") {
          throw createCompleteCheckoutError(
            "complete",
            result.error,
            "Failed to complete checkout"
          )
        }

        return {
          order: result.order,
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
