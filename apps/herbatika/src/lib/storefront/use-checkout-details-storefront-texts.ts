"use client"

import { useRequiredStorefrontText } from "./storefront-text-provider"
import { STOREFRONT_TEXT_KEYS } from "./storefront-texts"

export function useCheckoutDetailsStorefrontTexts() {
  return {
    addressUpdateFailed: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutAddressUpdateFailed
    ),
    billingDetails: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutBillingDetails
    ),
    billingSameAsShipping: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutBillingSameAsShipping
    ),
    companyPurchase: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCompanyPurchase
    ),
    contactAndBillingDetails: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutContactAndBillingDetails
    ),
    countryUnavailable: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutCountryUnavailable
    ),
    pickupDelivery: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutPickupDelivery
    ),
    privatePurchase: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutPrivatePurchase
    ),
    purchaseType: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutPurchaseType
    ),
    registrationInfo: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutRegistrationInfo
    ),
    registrationOptIn: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutRegistrationOptIn
    ),
    registrationUpdateFailed: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.checkoutRegistrationUpdateFailed
    ),
  }
}

export type CheckoutDetailsStorefrontTexts = ReturnType<
  typeof useCheckoutDetailsStorefrontTexts
>
