import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form";

export type AddressFormState = CheckoutAddressValues;

export const COUNTRY_SELECT_ITEMS: SelectItem[] = [
  { value: "SK", label: "Slovensko" },
  { value: "CZ", label: "Česko" },
  { value: "AT", label: "Rakúsko" },
  { value: "HU", label: "Maďarsko" },
];

export const CHECKOUT_STEPS = [
  { id: "cart", slug: "kosik", title: "Košík" },
  { id: "shipping-payment", slug: "doprava-platba", title: "Doprava a platba" },
  { id: "address", slug: "udaje", title: "Vaše údaje" },
  { id: "summary", slug: "suhrn", title: "Súhrn" },
] as const;

export type CheckoutStepSlug = (typeof CHECKOUT_STEPS)[number]["slug"];

export const DEFAULT_CHECKOUT_STEP_SLUG: CheckoutStepSlug = "kosik";
