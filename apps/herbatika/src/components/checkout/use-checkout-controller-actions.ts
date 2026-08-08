"use client"

import type { Dispatch, SetStateAction } from "react"

import { isRecord, readAccountSetupRequested } from "./account-setup-metadata"
import { logCheckoutAccountSetupDebug } from "./checkout-account-setup-debug"
import { resolveOrderId } from "./checkout-completion.utils"
import {
  clearStoredPaymentProviderSelection,
  writeStoredPaymentProviderSelection,
} from "./checkout-payment-selection-storage"
import { useCheckoutActions } from "./use-checkout-actions"
import type { useCheckoutRuntime } from "./use-checkout-runtime"

export type CheckoutRuntime = ReturnType<typeof useCheckoutRuntime>

const resolveCompleteResultOrderMetadata = (result: unknown): unknown => {
  if (!isRecord(result)) {
    return null
  }
  const order: unknown = Reflect.get(result, "order")
  return isRecord(order) ? Reflect.get(order, "metadata") : null
}

interface UseCheckoutControllerActionsProps {
  completedOrderId: string | null
  runtime: CheckoutRuntime
  setAllowCartAutoCreate: Dispatch<SetStateAction<boolean>>
  setCompletedOrderId: Dispatch<SetStateAction<string | null>>
}

export const useCheckoutControllerActions = ({
  completedOrderId,
  runtime,
  setAllowCartAutoCreate,
  setCompletedOrderId,
}: UseCheckoutControllerActionsProps) => {
  const {
    cartQuery,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    completeCheckoutMutation,
    effectiveSelectedPaymentProviderId,
    setCheckoutError,
  } = runtime

  return useCheckoutActions({
    canInitiatePayment: checkoutPaymentQuery.canInitiatePayment,
    cart: cartQuery.cart,
    ...(cartQuery.cart?.id === undefined ? {} : { cartId: cartQuery.cart.id }),
    completeCart: async () => {
      logCheckoutAccountSetupDebug("complete cart invoked", {
        cart_id: cartQuery.cart?.id ?? null,
        cart_metadata_requested: readAccountSetupRequested(
          cartQuery.cart?.metadata,
        ),
      })
      const result = await completeCheckoutMutation.mutateAsync(
        cartQuery.cart?.id === undefined ? {} : { cartId: cartQuery.cart.id },
      )
      const orderMetadata = resolveCompleteResultOrderMetadata(result)
      logCheckoutAccountSetupDebug("complete cart returned", {
        has_order_metadata: orderMetadata !== null,
        has_result: Boolean(result),
        order_id: resolveOrderId(result),
        order_metadata_requested: readAccountSetupRequested(orderMetadata),
      })
      return result
    },
    completedOrderId,
    initiatePayment: checkoutPaymentQuery.initiatePaymentAsync,
    itemCount: cartQuery.itemCount,
    onCheckoutErrorChange: setCheckoutError,
    onCompletedOrderIdChange: (orderId) => {
      if (orderId !== null && orderId.length > 0) {
        clearStoredPaymentProviderSelection(cartQuery.cart?.id)
      }
      setCompletedOrderId(orderId)
    },
    onOrderCompletionAbort: () => {
      setAllowCartAutoCreate(true)
    },
    onOrderCompletionStart: () => {
      setAllowCartAutoCreate(false)
    },
    onPaymentProviderSelect: (providerId) => {
      writeStoredPaymentProviderSelection({
        ...(cartQuery.cart?.id === undefined
          ? {}
          : { cartId: cartQuery.cart.id }),
        providerId,
      })
    },
    onPaymentRedirect: (url) => {
      window.location.assign(url)
    },
    refreshCart: async () => {
      const result = await cartQuery.query.refetch()
      return result.data ?? null
    },
    ...(effectiveSelectedPaymentProviderId === undefined
      ? {}
      : { selectedPaymentProviderId: effectiveSelectedPaymentProviderId }),
    selectedShippingMethodId:
      checkoutShippingQuery.selectedShippingMethodId ?? null,
    setShippingMethod: checkoutShippingQuery.setShipping,
  })
}
