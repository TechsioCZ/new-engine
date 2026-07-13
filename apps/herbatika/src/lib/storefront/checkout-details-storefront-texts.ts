export const CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS = {
  checkoutAddressUpdateFailed: "checkout.address_update_failed",
  checkoutBillingDetails: "checkout.billing_details",
  checkoutBillingSameAsShipping: "checkout.billing_same_as_shipping",
  checkoutCompanyPurchase: "checkout.company_purchase",
  checkoutContactAndBillingDetails: "checkout.contact_and_billing_details",
  checkoutCountryUnavailable: "checkout.country_unavailable",
  checkoutPickupDelivery: "checkout.pickup_delivery",
  checkoutPrivatePurchase: "checkout.private_purchase",
  checkoutPurchaseType: "checkout.purchase_type",
  checkoutRegistrationInfo: "checkout.registration_info",
  checkoutRegistrationOptIn: "checkout.registration_opt_in",
  checkoutRegistrationUpdateFailed: "checkout.registration_update_failed",
} as const

type CheckoutDetailsStorefrontTextKey =
  (typeof CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS)[keyof typeof CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS]

export const CHECKOUT_DETAILS_DEFAULT_STOREFRONT_TEXT_MESSAGES = {
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutAddressUpdateFailed]:
    "Uloženie adresy zlyhalo.",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutBillingDetails]:
    "Fakturačné údaje",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutBillingSameAsShipping]:
    "Fakturačná adresa je rovnaká ako doručovacia",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutCompanyPurchase]:
    "Nakupujem na firmu",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutContactAndBillingDetails]:
    "Kontaktné a fakturačné údaje",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutCountryUnavailable]:
    "Zvolená krajina nie je dostupná pre aktuálny košík. Zvoľte krajinu z ponuky.",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutPickupDelivery]:
    "Doručenie na výdajné miesto",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutPrivatePurchase]:
    "Súkromná osoba",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutPurchaseType]: "Typ nákupu",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutRegistrationInfo]:
    "(Informácie o registrácii Vám budú zaslané e-mailom)",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutRegistrationOptIn]:
    "Chcem sa registrovať",
  [CHECKOUT_DETAILS_STOREFRONT_TEXT_KEYS.checkoutRegistrationUpdateFailed]:
    "Uloženie registrácie zlyhalo.",
} as const satisfies Record<CheckoutDetailsStorefrontTextKey, string>
