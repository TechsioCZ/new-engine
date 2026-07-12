"use client"

import { useRequiredStorefrontText } from "./storefront-text-provider"
import {
  formatStorefrontText,
  STOREFRONT_TEXT_KEYS,
} from "./storefront-texts"

export const resolveCheckoutShippingExclTaxLabel = ({
  fallback,
  shippingName,
  template,
}: {
  fallback: string
  shippingName?: string
  template: string
}) =>
  shippingName
    ? formatStorefrontText(template, { shippingName })
    : fallback

export function useCheckoutStorefrontTexts() {
  return {
    backToCart: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutBackToCart
    ),
    backToShippingPayment: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutBackToShippingPayment
    ),
    cartEmpty: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCartEmpty
    ),
    cartNotReady: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCartNotReady
    ),
    completeFailed: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCompleteFailed
    ),
    completeOrder: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCompleteOrder
    ),
    completedAria: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCompletedAria
    ),
    continueToCustomerDetails: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutContinueToCustomerDetails
    ),
    continueToShippingPayment: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutContinueToShippingPayment
    ),
    continueToSummary: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutContinueToSummary
    ),
    customerDetails: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCustomerDetails
    ),
    edit: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.checkoutEdit),
    free: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.checkoutFree),
    itemQuantity: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutItemQuantity
    ),
    noPaymentMethods: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutNoPaymentMethods
    ),
    noShippingOptions: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutNoShippingOptions
    ),
    orderSummary: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutOrderSummary
    ),
    payment: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.checkoutPayment),
    paymentNotSelected: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutPaymentNotSelected
    ),
    paymentUpdateFailed: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutPaymentUpdateFailed
    ),
    pickupSelectionRequired: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutPickupSelectionRequired
    ),
    selectPickupBeforePayment: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutSelectPickupBeforePayment
    ),
    selectPaymentBeforeCompletion: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutSelectPaymentBeforeCompletion
    ),
    selectShippingBeforeCompletion: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutSelectShippingBeforeCompletion
    ),
    selectShippingBeforePayment: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutSelectShippingBeforePayment
    ),
    selectedPayment: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutSelectedPayment
    ),
    selectedShipping: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutSelectedShipping
    ),
    shipping: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.checkoutShipping),
    shippingExclTaxWithName: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutShippingExclTaxWithName
    ),
    shippingNotSelected: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutShippingNotSelected
    ),
    shippingPayment: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutShippingPayment
    ),
    shippingUpdateFailed: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutShippingUpdateFailed
    ),
    summary: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.checkoutSummary),
    totalExclTax: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutTotalExclTax
    ),
  }
}

export type CheckoutStorefrontTexts = ReturnType<
  typeof useCheckoutStorefrontTexts
>
