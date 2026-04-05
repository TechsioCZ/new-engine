import type { HttpTypes } from "@medusajs/types";
import type { AddressFormState } from "./checkout.constants";

const SHIPPING_REQUIRED_FIELD_LABELS = [
  ["email", "email"],
  ["firstName", "meno"],
  ["lastName", "priezvisko"],
  ["phone", "telefón"],
  ["address1", "ulica"],
  ["city", "mesto"],
  ["postalCode", "PSČ"],
  ["countryCode", "krajina"],
] as const satisfies ReadonlyArray<
  readonly [keyof AddressFormState, string]
>;

const BILLING_REQUIRED_FIELD_LABELS = [
  ["firstName", "meno"],
  ["lastName", "priezvisko"],
  ["address1", "ulica"],
  ["city", "mesto"],
  ["postalCode", "PSČ"],
  ["countryCode", "krajina"],
] as const satisfies ReadonlyArray<
  readonly [keyof AddressFormState, string]
>;

const COMPANY_REQUIRED_FIELD_LABELS = [
  ["company", "názov firmy"],
  ["companyId", "IČO"],
  ["taxId", "DIČ"],
] as const satisfies ReadonlyArray<
  readonly [keyof AddressFormState, string]
>;

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
] as const satisfies ReadonlyArray<keyof AddressFormState>;

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

const collectMissingFields = (
  form: AddressFormState,
  requiredFields: ReadonlyArray<readonly [keyof AddressFormState, string]>,
) => {
  const missing: string[] = [];

  for (const [field, label] of requiredFields) {
    if (!form[field].trim()) {
      missing.push(label);
    }
  }

  return missing;
};

const appendCompanyMissingFields = (
  missing: string[],
  form: AddressFormState,
  isCompanyPurchase: boolean,
) => {
  if (isCompanyPurchase) {
    for (const [field, label] of COMPANY_REQUIRED_FIELD_LABELS) {
      if (!form[field].trim()) {
        missing.push(label);
      }
    }
  }
};

export const buildMissingFieldMessage = ({
  billingForm,
  isCompanyPurchase,
  shippingForm,
  useSameAddress,
}: {
  billingForm: AddressFormState;
  isCompanyPurchase: boolean;
  shippingForm: AddressFormState;
  useSameAddress: boolean;
}) => {
  const shippingMissing = collectMissingFields(
    shippingForm,
    SHIPPING_REQUIRED_FIELD_LABELS,
  );

  if (useSameAddress) {
    appendCompanyMissingFields(shippingMissing, shippingForm, isCompanyPurchase);
  }

  const billingMissing = useSameAddress
    ? []
    : collectMissingFields(billingForm, BILLING_REQUIRED_FIELD_LABELS);

  if (!useSameAddress) {
    appendCompanyMissingFields(billingMissing, billingForm, isCompanyPurchase);
  }

  const missing = [
    ...shippingMissing.map((field) => `doručovacia adresa: ${field}`),
    ...billingMissing.map((field) => `fakturačná adresa: ${field}`),
  ];

  if (missing.length === 0) {
    return null;
  }

  return `Vyplňte povinné polia: ${missing.join(", ")}`;
};

export const resolveAddressFormsMatch = (
  left: Partial<AddressFormState> | null | undefined,
  right: Partial<AddressFormState> | null | undefined,
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
