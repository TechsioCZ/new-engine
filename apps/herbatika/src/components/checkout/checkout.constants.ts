import type { SelectItem } from "@techsio/ui-kit/molecules/select";
import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form";
import {
  checkoutStepSlugs,
  type CheckoutStepSlug as RouteCheckoutStepSlug,
} from "@/lib/route-paths";

export type AddressFormState = CheckoutAddressValues;

export const COUNTRY_SELECT_ITEMS: SelectItem[] = [
  { value: "SK", label: "Slovensko" },
  { value: "CZ", label: "Česko" },
  { value: "AT", label: "Rakúsko" },
  { value: "HU", label: "Maďarsko" },
];

export const CHECKOUT_STEPS = [
  { id: "cart", slug: checkoutStepSlugs.cart, title: "Košík" },
  {
    id: "shipping-payment",
    slug: checkoutStepSlugs.shippingPayment,
    title: "Doprava a platba",
  },
  { id: "address", slug: checkoutStepSlugs.address, title: "Vaše údaje" },
  { id: "summary", slug: checkoutStepSlugs.summary, title: "Súhrn" },
] as const;

export type CheckoutStepSlug = RouteCheckoutStepSlug;

export const DEFAULT_CHECKOUT_STEP_SLUG: CheckoutStepSlug =
  checkoutStepSlugs.cart;
