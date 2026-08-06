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

interface UseCheckoutActionsProps {
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

interface OrderCompletionBlockerMessages {
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
  if (cartId === undefined || cartId.length === 0) {
    return messages.cartNotReady
  }

  if (itemCount < 1) {
    return messages.cartEmpty
  }

  if (
    selectedShippingMethodId === undefined ||
    selectedShippingMethodId === null ||
    selectedShippingMethodId.length === 0
  ) {
    return messages.selectShippingBeforeCompletion
  }

  if (
    selectedPaymentProviderId === undefined ||
    selectedPaymentProviderId === null ||
    selectedPaymentProviderId.length === 0
  ) {
    return messages.selectPaymentBeforeCompletion
  }

  return null
}

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
    onCheckoutErrorChange(null)
    if (
      completedOrderId !== null &&
      completedOrderId !== undefined &&
      completedOrderId.length > 0
    ) {
      onCompletedOrderIdChange(null)
      onOrderCompletionAbort()
    }
  }

  const handleSelectShipping = (
    optionId: string,
    data?: Record<string, unknown>,
  ) => {
    resetFeedback()

    try {
      if (data) {
        writeStoredCarrierPickupSelection({
          ...(cartId === undefined ? {} : { cartId }),
          data,
          optionId,
        })
      } else {
        clearStoredCarrierPickupSelection(cartId)
      }
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
