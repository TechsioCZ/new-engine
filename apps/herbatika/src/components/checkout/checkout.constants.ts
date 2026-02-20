import type { SelectItem } from "@techsio/ui-kit/molecules/select";

export type AddressFormState = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  countryCode: string;
};

export const DEFAULT_ADDRESS_FORM: AddressFormState = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  postalCode: "",
  countryCode: "SK",
};

export const COUNTRY_SELECT_ITEMS: SelectItem[] = [
  { value: "SK", label: "Slovensko" },
  { value: "CZ", label: "Česko" },
  { value: "AT", label: "Rakúsko" },
  { value: "HU", label: "Maďarsko" },
];

export const CHECKOUT_STEPS = [
  { id: "cart", title: "Košík" },
  { id: "address", title: "Údaje" },
  { id: "shipping", title: "Doprava" },
  { id: "payment", title: "Platba" },
] as const;
