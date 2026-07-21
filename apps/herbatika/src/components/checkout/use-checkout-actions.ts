"use client"

import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  clearStoredCarrierPickupSelection,
  writeStoredCarrierPickupSelection,
} from "./carrier-pickup-selection-storage"
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "./checkout-completion.utils"
import { resolveReusablePaymentCollection } from "./checkout-payment-collection-reuse"
import { resolvePaymentRedirectUrl } from "./checkout-payment-redirect.utils"

type UseCheckoutActionsProps = {
  cart?: HttpTypes.StoreCart | null
  cartId?: string
  completedOrderId: string | null
  onCompletedOrderIdChange: (orderId: string | null) => void
  onOrderCompletionAbort: () => void
  onOrderCompletionStart: () => void
  onPaymentRedirect: (url: string) => void
  itemCount: number
  refreshCart?: () => Promise<HttpTypes.StoreCart | null>
  canInitiatePayment: boolean
  selectedPaymentProviderId?: string | null
  selectedShippingMethodId?: string | null
  completeCart: () => Promise<unknown>
  initiatePayment: (providerId: string) => Promise<unknown>
  onCheckoutErrorChange: (message: string | null) => void
  onPaymentProviderSelect: (providerId: string) => void
  setShippingMethod: (optionId: string, data?: Record<string, unknown>) => void
}

type OrderCompletionBlockerMessages = {
  cartEmpty: string
  cartNotReady: string
  selectPaymentBeforeCompletion: string
  selectShippingBeforeCompletion: string
}

const resolveOrderCompletionBlocker = ({
  cartId,
  itemCount,
  selectedPaymentProviderId,
  selectedShippingMethodId,
  messages,
}: Pick<
  UseCheckoutActionsProps,
  | "cartId"
  | "itemCount"
  | "selectedPaymentProviderId"
  | "selectedShippingMethodId"
> & {
  messages: OrderCompletionBlockerMessages
}) => {
  if (!cartId) {
    return messages.cartNotReady
  }

  if (itemCount < 1) {
    return messages.cartEmpty
  }

  if (!selectedShippingMethodId) {
    return messages.selectShippingBeforeCompletion
  }

  if (!selectedPaymentProviderId) {
    return messages.selectPaymentBeforeCompletion
  }

  return null
}

export function useCheckoutActions({
  cart,
  cartId,
  canInitiatePayment,
  completedOrderId,
  completeCart,
  initiatePayment,
  itemCount,
  onCheckoutErrorChange,
  onCompletedOrderIdChange,
  onOrderCompletionAbort,
  onOrderCompletionStart,
  onPaymentProviderSelect,
  onPaymentRedirect,
  refreshCart,
  selectedPaymentProviderId,
  selectedShippingMethodId,
  setShippingMethod,
}: UseCheckoutActionsProps) {
  const tCheckout = useTranslations("checkout")
  const resetFeedback = () => {
    onCheckoutErrorChange(null)
    if (completedOrderId) {
      onCompletedOrderIdChange(null)
      onOrderCompletionAbort()
    }
  }

  const handleSelectShipping = (
    optionId: string,
    data?: Record<string, unknown>
  ) => {
    resetFeedback()

    try {
      if (data) {
        writeStoredCarrierPickupSelection({ cartId, data, optionId })
      } else {
        clearStoredCarrierPickupSelection(cartId)
      }
      setShippingMethod(optionId, data)
    } catch (error) {
      onCheckoutErrorChange(
        resolveErrorMessage(error, tCheckout("shipping_update_failed"))
      )
    }
  }

  const handleSelectPaymentProvider = (providerId: string) => {
    resetFeedback()

    if (!canInitiatePayment) {
      onCheckoutErrorChange(tCheckout("select_shipping_before_payment"))
      return
    }

    try {
      onPaymentProviderSelect(providerId)
    } catch (error) {
      onCheckoutErrorChange(
        resolveErrorMessage(error, tCheckout("payment_update_failed"))
      )
    }
  }

  const handleCompleteOrder = async () => {
    resetFeedback()

    const blockerMessage = resolveOrderCompletionBlocker({
      cartId,
      itemCount,
      selectedPaymentProviderId,
      selectedShippingMethodId,
      messages: {
        cartEmpty: tCheckout("cart_empty"),
        cartNotReady: tCheckout("cart_not_ready"),
        selectPaymentBeforeCompletion: tCheckout(
          "select_payment_before_completion"
        ),
        selectShippingBeforeCompletion: tCheckout(
          "select_shipping_before_completion"
        ),
      },
    })
    if (blockerMessage) {
      onCheckoutErrorChange(blockerMessage)
      return
    }

    if (!selectedPaymentProviderId) {
      onCheckoutErrorChange(tCheckout("select_payment_before_completion"))
      return
    }

    onOrderCompletionStart()

    try {
      const latestCart = (await refreshCart?.()) ?? cart
      const reusablePaymentCollection = resolveReusablePaymentCollection({
        cart: latestCart,
        selectedPaymentProviderId,
      })

      const resolvedPaymentCollection =
        reusablePaymentCollection ??
        (await initiatePayment(selectedPaymentProviderId))
      const paymentRedirectUrl = resolvePaymentRedirectUrl(
        resolvedPaymentCollection
      )

      if (paymentRedirectUrl) {
        onPaymentRedirect(paymentRedirectUrl)
        return
      }

      const completeResult = await completeCart()
      const orderId = resolveOrderId(completeResult)

      if (orderId) {
        onCompletedOrderIdChange(orderId)
        return
      }

      const completionFailureMessage =
        resolveCompleteCartFailure(completeResult)

      if (completionFailureMessage) {
        onOrderCompletionAbort()
        onCheckoutErrorChange(completionFailureMessage)
        return
      }

      onOrderCompletionAbort()
      onCheckoutErrorChange(tCheckout("complete_failed"))
    } catch (error) {
      onOrderCompletionAbort()
      onCheckoutErrorChange(
        resolveErrorMessage(error, tCheckout("complete_failed"))
      )
    }
  }

  return {
    completedOrderId,
    handleCompleteOrder,
    handleSelectPaymentProvider,
    handleSelectShipping,
    resetFeedback,
  }
}
