import type { HttpTypes } from "@medusajs/types";
import { CHECKOUT_ADDRESS_FIELDS, type CheckoutAddressValues } from "@/lib/forms/checkout/address.form";

const ADDRESS_COMPARISON_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "company",
  "companyId",
  "taxId",
  "vatId",
  "address1",
  "address2",
  "city",
  "postalCode",
  "countryCode",
  "customerNote",
] as const satisfies ReadonlyArray<keyof CheckoutAddressValues>;

type CheckoutAddressFieldPath<
  TScope extends "billing" | "shipping",
  TField extends keyof CheckoutAddressValues = keyof CheckoutAddressValues,
> = `${TScope}.${TField}`;

export type CheckoutScopedFieldName =
  | CheckoutAddressFieldPath<"billing">
  | CheckoutAddressFieldPath<"shipping">;

const createCheckoutAddressFieldPaths = <TScope extends "billing" | "shipping">(
  scope: TScope,
  fields: ReadonlyArray<keyof CheckoutAddressValues>,
) => {
  return fields.map((field) => `${scope}.${field}` as CheckoutAddressFieldPath<TScope>);
};

const CHECKOUT_COMPANY_FIELD_NAMES = [
  "company",
  "companyId",
  "taxId",
  "vatId",
] as const satisfies ReadonlyArray<keyof CheckoutAddressValues>;

const CHECKOUT_BILLING_ACTIVE_FIELDS = CHECKOUT_ADDRESS_FIELDS.filter(
  (field) => field !== "address2" && field !== "customerNote" && field !== "email" && field !== "phone",
);

export const CHECKOUT_BILLING_ACTIVE_FIELD_NAMES = createCheckoutAddressFieldPaths(
  "billing",
  CHECKOUT_BILLING_ACTIVE_FIELDS,
);

export const CHECKOUT_BILLING_COMPANY_FIELD_NAMES = createCheckoutAddressFieldPaths(
  "billing",
  CHECKOUT_COMPANY_FIELD_NAMES,
);

export const CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES = createCheckoutAddressFieldPaths(
  "shipping",
  CHECKOUT_COMPANY_FIELD_NAMES,
);

const hasRequiredAddressFields = (
  address: HttpTypes.StoreCartAddress | null | undefined,
) => {
  return Boolean(
    address?.first_name &&
      address?.last_name &&
      address?.address_1 &&
      address?.city &&
      address?.postal_code &&
      address?.country_code,
  );
};

export const resolveAddressFormsMatch = (
  left: Partial<CheckoutAddressValues> | null | undefined,
  right: Partial<CheckoutAddressValues> | null | undefined,
) => {
  return ADDRESS_COMPARISON_FIELDS.every((field) => {
    const leftValue = left?.[field];
    const rightValue = right?.[field];

    return (typeof leftValue === "string" ? leftValue.trim() : "") ===
      (typeof rightValue === "string" ? rightValue.trim() : "");
  });
};

export const resolveHasStoredAddress = (
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  if (!cart?.email) {
    return false;
  }

  if (!hasRequiredAddressFields(cart.shipping_address)) {
    return false;
  }

  return hasRequiredAddressFields(cart.billing_address);
};
