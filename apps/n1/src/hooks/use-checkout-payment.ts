import type { HttpTypes } from "@medusajs/types"
import { checkoutFlow } from "./storefront-preset"
import { useCartToast } from "@/hooks/use-toast"
import type { Cart } from "@/types/cart"

export type UseCheckoutPaymentReturn = {
  paymentProviders?: HttpTypes.StorePaymentProvider[]
  initiatePayment: (providerId: string) => void
  initiatePaymentAsync: (
    providerId: string
  ) => Promise<HttpTypes.StorePaymentCollection>
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
  const toast = useCartToast()

  const payment = checkoutFlow.useCheckoutPayment(cartId, regionId, cart, {
    onError: () => {
      toast.paymentInitiatedError()
    },
  })

  return {
    paymentProviders: payment.paymentProviders,
    initiatePayment: payment.initiatePayment,
    initiatePaymentAsync: payment.initiatePaymentAsync,
    isInitiatingPayment: payment.isInitiatingPayment,
    isLoadingPaymentProviders: payment.isLoading,
    isFetchingPaymentProviders: payment.isFetching,
    canInitiatePayment: payment.canInitiatePayment,
    hasPaymentCollection: payment.hasPaymentCollection,
    hasPaymentSessions: payment.hasPaymentSessions,
  }
}
