import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form"
import {
  COUNTRY_SELECT_ITEMS as FORM_COUNTRY_SELECT_ITEMS,
  isCountryAvailableForRegion,
  resolveCountryItemsForRegion,
} from "@/lib/forms/country-options"

export const COUNTRY_SELECT_ITEMS = [...FORM_COUNTRY_SELECT_ITEMS]

export type AddressFormState = CheckoutAddressValues

export const isCheckoutCountryAvailableForRegion = (
  params: Parameters<typeof isCountryAvailableForRegion>[0]
) => isCountryAvailableForRegion(params)
export const resolveCheckoutCountryItemsForRegion = (
  params: Parameters<typeof resolveCountryItemsForRegion>[0]
) => resolveCountryItemsForRegion(params)

export const CHECKOUT_STEPS = [
  { id: "cart", slug: "kosik", title: "Košík" },
  { id: "shipping-payment", slug: "doprava-platba", title: "Doprava a platba" },
  { id: "address", slug: "udaje", title: "Vaše údaje" },
  { id: "summary", slug: "suhrn", title: "Súhrn" },
] as const

export type CheckoutStepSlug = (typeof CHECKOUT_STEPS)[number]["slug"]

export const DEFAULT_CHECKOUT_STEP_SLUG: CheckoutStepSlug = "kosik"
