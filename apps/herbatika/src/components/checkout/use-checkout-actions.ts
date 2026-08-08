"use client"

import { useTranslations } from "next-intl"

import { resolveErrorMessage } from "@/lib/storefront/error-utils"

import type { UseCheckoutActionsProps } from "./checkout-actions.utils"
import {
  persistCarrierPickupSelection,
  resetCheckoutActionFeedback,
  resolveOrderCompletionBlocker,
} from "./checkout-actions.utils"
import {
  resolveCompleteCartFailure,
  resolveOrderId,
} from "./checkout-completion.utils"
import { resolveReusablePaymentCollection } from "./checkout-payment-collection-reuse"
import { resolvePaymentRedirectUrl } from "./checkout-payment-redirect.utils"

export const useCheckoutActions = ({
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
}: UseCheckoutActionsProps) => {
  const tCheckout = useTranslations("checkout")
  const resetFeedback = () => {
    resetCheckoutActionFeedback({
      completedOrderId,
      onCheckoutErrorChange,
      onCompletedOrderIdChange,
      onOrderCompletionAbort,
    })
  }

  const handleSelectShipping = (
    optionId: string,
    data?: Record<string, unknown>,
  ) => {
    resetFeedback()

    try {
      persistCarrierPickupSelection({ cartId, data, optionId })
      setShippingMethod(optionId, data)
    } catch (error) {
      onCheckoutErrorChange(
        resolveErrorMessage(error, tCheckout("shipping_update_failed")),
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
        resolveErrorMessage(error, tCheckout("payment_update_failed")),
      )
    }
  }

  const blockerMessage = resolveOrderCompletionBlocker({
    ...(cartId === undefined ? {} : { cartId }),
    itemCount,
    ...(selectedPaymentProviderId === undefined
      ? {}
      : { selectedPaymentProviderId }),
    ...(selectedShippingMethodId === undefined
      ? {}
      : { selectedShippingMethodId }),
    messages: {
      cartEmpty: tCheckout("cart_empty"),
      cartNotReady: tCheckout("cart_not_ready"),
      selectPaymentBeforeCompletion: tCheckout(
        "select_payment_before_completion",
      ),
      selectShippingBeforeCompletion: tCheckout(
        "select_shipping_before_completion",
      ),
    },
  })

  const handleCompleteOrder = async () => {
    resetFeedback()

    if (
      blockerMessage !== null &&
      blockerMessage !== undefined &&
      blockerMessage.length > 0
    ) {
      onCheckoutErrorChange(blockerMessage)
      return
    }

    onOrderCompletionStart()
    const paymentProviderId = selectedPaymentProviderId ?? ""

    try {
      const latestCart = (await refreshCart?.()) ?? cart
      const reusablePaymentCollection = resolveReusablePaymentCollection({
        ...(latestCart === undefined ? {} : { cart: latestCart }),
        selectedPaymentProviderId: paymentProviderId,
      })

      const resolvedPaymentCollection =
        reusablePaymentCollection ?? (await initiatePayment(paymentProviderId))
      const paymentRedirectUrl = resolvePaymentRedirectUrl(
        resolvedPaymentCollection,
      )

      if (
        paymentRedirectUrl !== null &&
        paymentRedirectUrl !== undefined &&
        paymentRedirectUrl.length > 0
      ) {
        onPaymentRedirect(paymentRedirectUrl)
        return
      }

      const completeResult = await completeCart()
      const orderId = resolveOrderId(completeResult)

      if (orderId !== null && orderId !== undefined && orderId.length > 0) {
        onCompletedOrderIdChange(orderId)
        return
      }

      const completionFailureMessage =
        resolveCompleteCartFailure(completeResult)

      if (
        completionFailureMessage !== null &&
        completionFailureMessage !== undefined &&
        completionFailureMessage.length > 0
      ) {
        onOrderCompletionAbort()
        onCheckoutErrorChange(completionFailureMessage)
        return
      }

      onOrderCompletionAbort()
      onCheckoutErrorChange(tCheckout("complete_failed"))
    } catch (error) {
      onOrderCompletionAbort()
      onCheckoutErrorChange(
        resolveErrorMessage(error, tCheckout("complete_failed")),
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
