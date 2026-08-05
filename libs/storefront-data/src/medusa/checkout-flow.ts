import type { HttpTypes } from "@medusajs/types"
import type { QueryClient } from "@tanstack/react-query"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { omitUndefined, toPlainRecord } from "@techsio/std/object"

import type { MedusaCompleteCartResult } from "../cart/medusa-service"
import { getCachedCartById } from "../shared/cart-cache-sync"
import type { ActiveCartQueryKeyMatcher } from "../shared/cart-cache-sync"
import {
  resolveCheckoutCartInput,
  resolveEffectiveCheckoutCart,
  resolveExistingPaymentCollection,
  resolveSelectedPaymentProviderId,
} from "../shared/checkout-flow-utils"
import { createErrorWithStage } from "../shared/error-utils"
import type { StorageValueStore } from "../shared/storage-value-store"
import { createMedusaCartFlow } from "./cart-flow"
import type { MedusaCartFlowStorefront } from "./cart-flow"

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
  },
) => {
  shippingOptions: HttpTypes.StoreCartShippingOption[]
  shippingPrices: Record<string, number>
  isLoading: boolean
  isFetching: boolean
  isCalculating: boolean
  setShippingMethod: (optionId: string, data?: Record<string, unknown>) => void
  isSettingShipping: boolean
  selectedShippingMethodId?: string
  selectedShippingMethodData?: Record<string, unknown>
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
  },
) => {
  paymentProviders: HttpTypes.StorePaymentProvider[]
  initiatePayment: (providerId: string) => void
  initiatePaymentAsync: (
    providerId: string,
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
        regionId: string,
      ) => Promise<HttpTypes.StorePaymentProvider[]>
    }
  }
}

export type MedusaShippingMethodData = Record<string, unknown>

export interface UseMedusaCheckoutShippingOptions {
  enabled?: boolean
  calculatePrices?: boolean
  onSuccess?: (cart: HttpTypes.StoreCart) => void
  onError?: (error: unknown) => void
  normalizeShippingData?: (
    data?: MedusaShippingMethodData,
  ) => Record<string, unknown> | undefined
}

export interface UseMedusaCheckoutShippingReturn {
  shippingOptions: HttpTypes.StoreCartShippingOption[]
  shippingPrices: Record<string, number>
  isLoading: boolean
  isFetching: boolean
  isCalculating: boolean
  setShipping: (optionId: string, data?: MedusaShippingMethodData) => void
  isSettingShipping: boolean
  canLoadShipping: boolean
  canSetShipping: boolean
  selectedShippingMethodId?: string
  selectedOption?: HttpTypes.StoreCartShippingOption
}

export interface UseMedusaCheckoutPaymentOptions {
  enabled?: boolean
  onSuccess?: (paymentCollection: HttpTypes.StorePaymentCollection) => void
  onError?: (error: unknown) => void
}

export interface UseMedusaCheckoutPaymentReturn {
  paymentProviders: HttpTypes.StorePaymentProvider[]
  initiatePayment: (providerId: string) => void
  initiatePaymentAsync: (
    providerId: string,
  ) => Promise<HttpTypes.StorePaymentCollection>
  isInitiatingPayment: boolean
  isLoading: boolean
  isFetching: boolean
  canInitiatePayment: boolean
  hasPaymentCollection: boolean
  hasPaymentSessions: boolean
}

export interface CreateMedusaCheckoutFlowConfig {
  storefront: MedusaCheckoutFlowStorefront
  cartStorage?: StorageValueStore | undefined
  isActiveCartQueryKey?: ActiveCartQueryKeyMatcher | undefined
}

export interface UseMedusaCompleteCheckoutInput {
  cartId?: string
  cart?: HttpTypes.StoreCart | null
  regionId?: string
  enabled?: boolean
}

export interface MedusaCompleteCheckoutRequest {
  paymentProviderId?: string
}

export type MedusaCompleteCheckoutStage =
  | "cart"
  | "payment_provider"
  | "payment"
  | "complete"

export interface MedusaCompleteCheckoutError {
  stage: MedusaCompleteCheckoutStage
  message: string
  cause?: unknown
}

export interface MedusaCompleteCheckoutSuccess {
  order: HttpTypes.StoreOrder
  paymentCollection: HttpTypes.StorePaymentCollection
  paymentProviderId: string
}

export interface ResolvePaymentProviderContext {
  cart?: HttpTypes.StoreCart | null
  existingPaymentProviderId?: string
  paymentProviders: HttpTypes.StorePaymentProvider[]
  requestedPaymentProviderId?: string
}

export interface UseMedusaCompleteCheckoutOptions {
  resolvePaymentProviderId?: (
    context: ResolvePaymentProviderContext,
  ) => string | null | undefined
  onSuccess?: (result: MedusaCompleteCheckoutSuccess) => void
  onError?: (error: MedusaCompleteCheckoutError) => void
}

const defaultNormalizeShippingData = (
  data?: MedusaShippingMethodData,
): Record<string, unknown> | undefined => {
  if (!data) {
    return
  }

  const entries = Object.entries(data).filter(
    ([, value]) => value !== null && value !== "",
  )

  if (entries.length === 0) {
    return
  }

  return Object.fromEntries(entries)
}

const toComparableShippingData = (data?: Record<string, unknown>): string =>
  JSON.stringify(
    Object.entries(data ?? {})
      .filter(([, value]) => value !== null && value !== "")
      .toSorted(([left], [right]) => left.localeCompare(right)),
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
    toComparableShippingData(toPlainRecord(currentData))
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
    resolveContext: ResolvePaymentProviderContext,
  ) => string | null | undefined,
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

const resolveCheckoutEffectiveCart = ({
  cartId,
  cart,
  getCachedCart,
}: {
  cartId: string
  cart?: HttpTypes.StoreCart | null
  getCachedCart: (effectiveCartId: string) => HttpTypes.StoreCart | null
}): HttpTypes.StoreCart | null =>
  resolveEffectiveCheckoutCart(omitUndefined({ cart, cartId, getCachedCart }))

const ensureCheckoutPaymentCollection = async ({
  effectiveCart,
  paymentProviderId,
  initiatePaymentAsync,
}: {
  effectiveCart: HttpTypes.StoreCart | null
  paymentProviderId: string
  initiatePaymentAsync: (
    providerId: string,
  ) => Promise<HttpTypes.StorePaymentCollection>
}): Promise<HttpTypes.StorePaymentCollection> => {
  const existingPaymentCollection = resolveExistingPaymentCollection(
    effectiveCart,
    paymentProviderId,
  )
  if (existingPaymentCollection) {
    return existingPaymentCollection
  }
  return await initiatePaymentAsync(paymentProviderId)
}

const completeCheckoutOrder = async ({
  cartId,
  completeCartMutation,
}: {
  cartId: string
  completeCartMutation: (input: {
    cartId?: string
  }) => Promise<MedusaCompleteCartResult>
}): Promise<HttpTypes.StoreOrder> => {
  const result = await completeCartMutation({ cartId })
  if (result.type !== "order") {
    throw result.error
  }
  return result.order
}

export function createMedusaCheckoutFlow({
  storefront,
  cartStorage,
  isActiveCartQueryKey,
}: CreateMedusaCheckoutFlowConfig) {
  const checkoutHooks = storefront.hooks.checkout
  const cartFlow = createMedusaCartFlow(
    omitUndefined({ cartStorage, isActiveCartQueryKey, storefront }),
  )

  function useCheckoutShipping(
    cartId?: string,
    cart?: HttpTypes.StoreCart | null,
    options?: UseMedusaCheckoutShippingOptions,
  ): UseMedusaCheckoutShippingReturn {
    const { resolvedCartId, normalizedCart } = resolveCheckoutCartInput(
      omitUndefined({ cart, cartId }),
    )
    const normalizeShippingData =
      options?.normalizeShippingData ?? defaultNormalizeShippingData
    const canLoadShipping = Boolean(resolvedCartId)
    const shipping = checkoutHooks.useCheckoutShipping(
      omitUndefined({
        calculatePrices: options?.calculatePrices,
        cart: normalizedCart,
        cartId: resolvedCartId,
        enabled: options?.enabled ?? canLoadShipping,
      }),
      {
        onError: (error: unknown) => {
          options?.onError?.(error)
        },
        onSuccess: (updatedCart: HttpTypes.StoreCart) => {
          options?.onSuccess?.(updatedCart)
        },
      },
    )

    const setShipping = (optionId: string, data?: MedusaShippingMethodData) => {
      const cleanedData = normalizeShippingData(data)
      const currentData =
        shipping.selectedShippingMethodId === optionId
          ? shipping.selectedShippingMethodData
          : undefined

      if (
        isSameShippingSelection(
          omitUndefined({
            currentData,
            nextData: cleanedData,
            nextOptionId: optionId,
            selectedOptionId: shipping.selectedShippingMethodId,
          }),
        )
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

    return omitUndefined({
      canLoadShipping,
      canSetShipping: shippingOptions.length > 0,
      isCalculating,
      isFetching,
      isLoading,
      isSettingShipping,
      selectedOption,
      selectedShippingMethodId,
      setShipping,
      shippingOptions,
      shippingPrices,
    })
  }

  function useCheckoutPayment(
    cartId?: string,
    regionId?: string,
    cart?: HttpTypes.StoreCart | null,
    options?: UseMedusaCheckoutPaymentOptions,
  ): UseMedusaCheckoutPaymentReturn {
    const { resolvedCartId, normalizedCart } = resolveCheckoutCartInput(
      omitUndefined({ cart, cartId }),
    )
    const payment = checkoutHooks.useCheckoutPayment(
      omitUndefined({
        cart: normalizedCart,
        cartId: resolvedCartId,
        enabled: options?.enabled ?? Boolean(resolvedCartId),
        regionId,
      }),
      {
        onError: (error: unknown) => {
          options?.onError?.(error)
        },
        onSuccess: (paymentCollection: HttpTypes.StorePaymentCollection) => {
          options?.onSuccess?.(paymentCollection)
        },
      },
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
      canInitiatePayment,
      hasPaymentCollection,
      hasPaymentSessions,
      initiatePayment,
      initiatePaymentAsync,
      isFetching,
      isInitiatingPayment,
      isLoading,
      paymentProviders,
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
      omitUndefined({
        cart: effectiveCart,
        existingPaymentProviderId,
        paymentProviders,
        requestedPaymentProviderId,
      }),
      resolvePaymentProviderId,
    )
    if (initialSelection.paymentProviderId !== null) {
      return initialSelection.paymentProviderId
    }
    if (initialSelection.wasExplicit || !effectiveRegionId) {
      throw new Error("No payment provider available")
    }

    const refreshedPaymentProviders = await checkoutHooks.fetchPaymentProviders(
      queryClient,
      effectiveRegionId,
    )
    const refreshedSelection = resolvePaymentProviderSelection(
      omitUndefined({
        cart: effectiveCart,
        existingPaymentProviderId,
        paymentProviders: refreshedPaymentProviders,
        requestedPaymentProviderId,
      }),
      resolvePaymentProviderId,
    )
    if (!refreshedSelection.paymentProviderId) {
      throw new Error("No payment provider available")
    }
    return refreshedSelection.paymentProviderId
  }

  function useCompleteCheckout(
    input: UseMedusaCompleteCheckoutInput,
    options?: UseMedusaCompleteCheckoutOptions,
  ) {
    const queryClient = useQueryClient()
    const { resolvedCartId, normalizedCart } = resolveCheckoutCartInput(
      omitUndefined({ cart: input.cart, cartId: input.cartId }),
    )
    const payment = useCheckoutPayment(
      resolvedCartId,
      input.regionId,
      normalizedCart,
      {
        enabled: input.enabled ?? Boolean(resolvedCartId),
      },
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
          resolveCheckoutCartInput(
            omitUndefined({ cart: input.cart, cartId: input.cartId }),
          )
        if (!mutationCartId) {
          throw createErrorWithStage<MedusaCompleteCheckoutStage>(
            "cart",
            "Cart id is required",
          )
        }

        const effectiveCart = resolveCheckoutEffectiveCart(
          omitUndefined({
            cart: mutationCart,
            cartId: mutationCartId,
            getCachedCart: (effectiveCartId: string) =>
              getCachedCartById<HttpTypes.StoreCart>(
                queryClient,
                storefront.queryKeys.cart,
                effectiveCartId,
                { isActiveCartQueryKey },
              ) ?? null,
          }),
        )
        const effectiveRegionId =
          input.regionId ?? effectiveCart?.region_id ?? undefined

        let paymentProviderId: string
        try {
          paymentProviderId = await resolveCheckoutPaymentProviderId(
            omitUndefined({
              effectiveCart,
              effectiveRegionId,
              paymentProviders,
              queryClient,
              requestedPaymentProviderId: request?.paymentProviderId,
              resolvePaymentProviderId,
            }),
          )
        } catch (error) {
          throw createErrorWithStage<MedusaCompleteCheckoutStage>(
            "payment_provider",
            "Failed to resolve payment provider",
            error,
          )
        }

        let paymentCollection: HttpTypes.StorePaymentCollection
        try {
          paymentCollection = await ensureCheckoutPaymentCollection({
            effectiveCart,
            initiatePaymentAsync,
            paymentProviderId,
          })
        } catch (error) {
          throw createErrorWithStage<MedusaCompleteCheckoutStage>(
            "payment",
            "Failed to initiate payment",
            error,
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
            error,
          )
        }

        return {
          order,
          paymentCollection,
          paymentProviderId,
        }
      },
      onError: (error) => {
        options?.onError?.(error)
      },
      onSuccess: (result) => {
        options?.onSuccess?.(result)
      },
    })
  }

  return {
    useCheckoutPayment,
    useCheckoutShipping,
    useCompleteCheckout,
  }
}
