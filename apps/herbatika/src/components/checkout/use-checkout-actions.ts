"use client"

import type { HttpTypes } from "@medusajs/types"
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

const resolveOrderCompletionBlocker = ({
  cartId,
  itemCount,
  selectedPaymentProviderId,
  selectedShippingMethodId,
}: Pick<
  UseCheckoutActionsProps,
  | "cartId"
  | "itemCount"
  | "selectedPaymentProviderId"
  | "selectedShippingMethodId"
>) => {
  if (!cartId) {
    return "Košík nie je pripravený."
  }

  if (itemCount < 1) {
    return "Košík je prázdny. Pridajte najprv produkty."
  }

  if (!selectedShippingMethodId) {
    return "Vyberte dopravu pred dokončením objednávky."
  }

  if (!selectedPaymentProviderId) {
    return "Vyberte platobnú metódu pred dokončením objednávky."
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
        resolveErrorMessage(error, "Nastavenie dopravy zlyhalo.")
      )
    }
  }

  const handleSelectPaymentProvider = (providerId: string) => {
    resetFeedback()

    if (!canInitiatePayment) {
      onCheckoutErrorChange("Najprv vyberte dopravu.")
      return
    }

    try {
      onPaymentProviderSelect(providerId)
    } catch (error) {
      onCheckoutErrorChange(
        resolveErrorMessage(error, "Nastavenie platby zlyhalo.")
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
    })
    if (blockerMessage) {
      onCheckoutErrorChange(blockerMessage)
      return
    }

    if (!selectedPaymentProviderId) {
      onCheckoutErrorChange(
        "Vyberte platobnú metódu pred dokončením objednávky."
      )
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
      onCheckoutErrorChange("Dokončenie objednávky zlyhalo.")
    } catch (error) {
      onOrderCompletionAbort()
      onCheckoutErrorChange(
        resolveErrorMessage(error, "Dokončenie objednávky zlyhalo.")
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
