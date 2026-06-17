import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form"

export {
  COUNTRY_SELECT_ITEMS,
  isCountryAvailableForRegion as isCheckoutCountryAvailableForRegion,
  resolveCountryItemsForRegion as resolveCheckoutCountryItemsForRegion,
} from "@/lib/forms/country-options"

export type AddressFormState = CheckoutAddressValues

export const CHECKOUT_STEPS = [
  { id: "cart", slug: "kosik", title: "Košík" },
  { id: "shipping-payment", slug: "doprava-platba", title: "Doprava a platba" },
  { id: "address", slug: "udaje", title: "Vaše údaje" },
  { id: "summary", slug: "suhrn", title: "Súhrn" },
] as const

export type CheckoutStepSlug = (typeof CHECKOUT_STEPS)[number]["slug"]

export const DEFAULT_CHECKOUT_STEP_SLUG: CheckoutStepSlug = "kosik"
