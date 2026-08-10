import type { HttpTypes } from "@medusajs/types"

import {
  clearStoredCarrierPickupSelection,
  writeStoredCarrierPickupSelection,
} from "./carrier-pickup-selection-storage"
import type { CarrierPickupData } from "./carrier-pickup.utils"

export interface UseCheckoutActionsProps {
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
  setShippingMethod: (optionId: string, data?: CarrierPickupData) => void
}

interface OrderCompletionBlockerMessages {
  cartEmpty: string
  cartNotReady: string
  selectPaymentBeforeCompletion: string
  selectShippingBeforeCompletion: string
}

export const resolveOrderCompletionBlocker = ({
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

export const resetCheckoutActionFeedback = ({
  completedOrderId,
  onCheckoutErrorChange,
  onCompletedOrderIdChange,
  onOrderCompletionAbort,
}: Pick<
  UseCheckoutActionsProps,
  | "completedOrderId"
  | "onCheckoutErrorChange"
  | "onCompletedOrderIdChange"
  | "onOrderCompletionAbort"
>) => {
  onCheckoutErrorChange(null)
  if (completedOrderId !== null && completedOrderId.length > 0) {
    onCompletedOrderIdChange(null)
    onOrderCompletionAbort()
  }
}

export const persistCarrierPickupSelection = ({
  cartId,
  data,
  optionId,
}: {
  cartId: string | undefined
  data: CarrierPickupData | undefined
  optionId: string
}) => {
  if (data) {
    writeStoredCarrierPickupSelection({
      ...(cartId === undefined ? {} : { cartId }),
      data,
      optionId,
    })
    return
  }

  clearStoredCarrierPickupSelection(cartId)
}
