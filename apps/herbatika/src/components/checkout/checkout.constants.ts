import type { SelectItem } from "@techsio/ui-kit/molecules/select";

export type AddressFormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  companyId: string;
  taxId: string;
  vatId: string;
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  countryCode: string;
  customerNote: string;
};

export const DEFAULT_ADDRESS_FORM: AddressFormState = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  companyId: "",
  taxId: "",
  vatId: "",
  address1: "",
  address2: "",
  city: "",
  postalCode: "",
  countryCode: "SK",
  customerNote: "",
};

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
