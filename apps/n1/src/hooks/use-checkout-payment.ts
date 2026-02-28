import type { HttpTypes } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { getCachedCartById, patchCartCaches } from "./cart-cache-sync"
import { checkoutHooks } from "./checkout-hooks-base"
import { useCartToast } from "@/hooks/use-toast"
import type { Cart } from "@/types/cart"

export type UseCheckoutPaymentReturn = {
  paymentProviders?: HttpTypes.StorePaymentProvider[]
  initiatePayment: (providerId: string) => void
  initiatePaymentAsync: (providerId: string) => Promise<HttpTypes.StorePaymentCollection>
  isInitiatingPayment: boolean
  isLoadingPaymentProviders: boolean
  isFetchingPaymentProviders: boolean
  canInitiatePayment: boolean
  hasPaymentCollection: boolean
  hasPaymentSessions: boolean
}

export function useCheckoutPayment(
  cartId?: string,
  regionId?: string,
  cart?: Cart | null
): UseCheckoutPaymentReturn {
  const queryClient = useQueryClient()
  const toast = useCartToast()
  const cachedCart = cartId ? getCachedCartById(queryClient, cartId) : null
  const effectiveCart = cart ?? cachedCart
  const resolvedRegionId = regionId ?? effectiveCart?.region_id ?? undefined

  const payment = checkoutHooks.useCheckoutPayment(
    {
      cartId,
      regionId: resolvedRegionId,
      cart: effectiveCart,
      enabled: Boolean(resolvedRegionId),
    },
    {
      // Keep cart UI in sync immediately after payment session init.
      onSuccess: (paymentCollection) => {
        if (!cartId) {
          return
        }
        patchCartCaches(queryClient, cartId, (cached) => ({
          ...cached,
          payment_collection: paymentCollection,
        }))
      },
      onError: () => {
        toast.paymentInitiatedError()
      },
    }
  )

  const canInitiatePayment = Boolean(
    cartId && (effectiveCart?.shipping_methods?.length ?? 0) > 0
  )
  const hasPaymentCollection = Boolean(effectiveCart?.payment_collection)
  const hasPaymentSessions =
    (effectiveCart?.payment_collection?.payment_sessions?.length ?? 0) > 0

  return {
    paymentProviders: payment.paymentProviders,
    initiatePayment: payment.initiatePayment,
    initiatePaymentAsync: payment.initiatePaymentAsync,
    isInitiatingPayment: payment.isInitiatingPayment,
    isLoadingPaymentProviders: payment.isLoading,
    isFetchingPaymentProviders: payment.isFetching,
    canInitiatePayment,
    hasPaymentCollection,
    hasPaymentSessions,
  }
}
