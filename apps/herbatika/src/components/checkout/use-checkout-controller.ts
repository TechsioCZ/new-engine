"use client"

import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"

import { resolveCheckoutSummary } from "./checkout-summary.utils"
import { useCheckoutAddressController } from "./use-checkout-address-controller"
import { useCheckoutCompletionController } from "./use-checkout-completion-controller"
import { useCheckoutControllerActions } from "./use-checkout-controller-actions"
import { useCheckoutRuntime } from "./use-checkout-runtime"
import type { CheckoutRuntime } from "./use-checkout-runtime"

type CheckoutDetailsController = ReturnType<
  typeof useCheckoutAddressController
>["checkoutDetailsForm"]

export type CheckoutController = ReturnType<
  typeof useCheckoutControllerActions
> &
  ReturnType<typeof resolveCheckoutSummary> & {
    billingAddressForm: CheckoutDetailsController["effectiveValues"]["billing"]
    cartQuery: CheckoutRuntime["cartQuery"]
    checkoutDetailsForm: CheckoutDetailsController
    checkoutError: string | null
    checkoutPaymentQuery: CheckoutRuntime["checkoutPaymentQuery"]
    checkoutShippingQuery: CheckoutRuntime["checkoutShippingQuery"]
    completeCheckoutMutation: CheckoutRuntime["completeCheckoutMutation"]
    completedOrderId: string | null
    countryItems: CheckoutRuntime["countryItems"]
    handleCompleteOrder: ReturnType<typeof useCheckoutCompletionController>
    handleSaveAddress: ReturnType<
      typeof useCheckoutAddressController
    >["handleSaveAddress"]
    heurekaConsent: boolean
    isAuthenticated: boolean
    isCompanyPurchase: boolean
    marketingConsent: boolean
    selectedPaymentProviderId: string | null | undefined
    setHeurekaConsent: Dispatch<SetStateAction<boolean>>
    setMarketingConsent: Dispatch<SetStateAction<boolean>>
    shippingAddressForm: CheckoutDetailsController["effectiveValues"]["shipping"]
    updateCartAddressMutation: CheckoutRuntime["updateCartAddressMutation"]
    useSameAddress: boolean
  }

export const useCheckoutController = (): CheckoutController => {
  const [allowCartAutoCreate, setAllowCartAutoCreate] = useState(true)
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null)
  const [marketingConsent, setMarketingConsent] = useState(false)
  const [heurekaConsent, setHeurekaConsent] = useState(false)
  const runtime = useCheckoutRuntime({ allowCartAutoCreate, completedOrderId })
  const {
    authQuery,
    cartQuery,
    checkoutError,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    completeCheckoutMutation,
    countryItems,
    effectiveSelectedPaymentProviderId,
    regionCurrencyCode,
    updateCartAddressMutation,
  } = runtime
  const actions = useCheckoutControllerActions({
    completedOrderId,
    runtime,
    setAllowCartAutoCreate,
    setCompletedOrderId,
  })
  const { checkoutDetailsForm, handleSaveAddress } =
    useCheckoutAddressController(runtime, actions.resetFeedback)
  const handleCompleteOrder = useCheckoutCompletionController({
    checkoutDetailsForm,
    completeOrder: actions.handleCompleteOrder,
    runtime,
  })
  const {
    canCompleteOrder,
    cartItems,
    cartItemsSubtotalAmount,
    cartItemsTotalAmount,
    cartShippingSubtotalAmount,
    cartShippingTotalAmount,
    cartTaxAmount,
    cartTotalAmount,
    cartTotalWithoutTaxAmount,
    currencyCode,
    hasItems,
    hasPayment,
    hasShipping,
    hasStoredAddress,
    isBusy,
  } = resolveCheckoutSummary({
    cart: cartQuery.cart,
    effectiveSelectedPaymentProviderId,
    itemCount: cartQuery.itemCount,
    pendingStates: [
      cartQuery.isFetching,
      runtime.regionsQuery.isLoading,
      runtime.regionsQuery.isFetching,
      updateCartAddressMutation.isPending,
      runtime.updateCartMutation.isPending,
      checkoutShippingQuery.isSettingShipping,
      checkoutPaymentQuery.isInitiatingPayment,
      completeCheckoutMutation.isPending,
    ],
    regionCurrencyCode,
    selectedShippingMethodId: checkoutShippingQuery.selectedShippingMethodId,
    shippingPrices: checkoutShippingQuery.shippingPrices,
  })

  return {
    ...actions,
    billingAddressForm: checkoutDetailsForm.effectiveValues.billing,
    canCompleteOrder,
    cartItems,
    cartItemsSubtotalAmount,
    cartItemsTotalAmount,
    cartQuery,
    cartShippingSubtotalAmount,
    cartShippingTotalAmount,
    cartTaxAmount,
    cartTotalAmount,
    cartTotalWithoutTaxAmount,
    checkoutDetailsForm,
    checkoutError,
    checkoutPaymentQuery,
    checkoutShippingQuery,
    completeCheckoutMutation,
    completedOrderId,
    countryItems,
    currencyCode,
    handleCompleteOrder,
    handleSaveAddress,
    hasItems,
    hasPayment,
    hasShipping,
    hasStoredAddress,
    heurekaConsent,
    isAuthenticated: authQuery.isAuthenticated,
    isBusy,
    isCompanyPurchase: checkoutDetailsForm.values.isCompanyPurchase,
    marketingConsent,
    selectedPaymentProviderId: effectiveSelectedPaymentProviderId,
    setHeurekaConsent,
    setMarketingConsent,
    shippingAddressForm: checkoutDetailsForm.effectiveValues.shipping,
    updateCartAddressMutation,
    useSameAddress: checkoutDetailsForm.values.useSameAddress,
  }
}
