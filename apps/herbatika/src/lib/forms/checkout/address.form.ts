import {
  defaultCheckoutAddressRequiredFields,
  type CheckoutAddressInput,
} from "@techsio/storefront-data/checkout/address";

export type CheckoutAddressValues = {
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

export type CheckoutDetailsValues = {
  shipping: CheckoutAddressValues;
  billing: CheckoutAddressValues;
  useSameAddress: boolean;
  isCompanyPurchase: boolean;
  marketingConsent: boolean;
  heurekaConsent: boolean;
};

export type CheckoutAddressDetailsValues = Pick<
  CheckoutDetailsValues,
  "billing" | "isCompanyPurchase" | "shipping" | "useSameAddress"
>;

export const CHECKOUT_ADDRESS_FIELDS = [
  "email",
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

export const DEFAULT_CHECKOUT_ADDRESS_VALUES: CheckoutAddressValues = {
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

export const CHECKOUT_BILLING_REQUIRED_FIELDS =
  defaultCheckoutAddressRequiredFields;

export const CHECKOUT_SHIPPING_REQUIRED_FIELDS = [
  ...defaultCheckoutAddressRequiredFields,
  "phone",
] as const satisfies readonly (keyof CheckoutAddressInput)[];

export const CHECKOUT_COMPANY_REQUIRED_FIELDS = [
  "company",
  "companyId",
  "taxId",
] as const satisfies readonly (keyof CheckoutAddressValues)[];

export const createDefaultCheckoutAddressValues = (): CheckoutAddressValues => ({
  ...DEFAULT_CHECKOUT_ADDRESS_VALUES,
});

const clearCheckoutCompanyFields = (
  address: CheckoutAddressValues,
): CheckoutAddressValues => {
  return {
    ...address,
    company: "",
    companyId: "",
    taxId: "",
    vatId: "",
  };
};

export const resolveEffectiveCheckoutAddressDetails = (
  values: CheckoutAddressDetailsValues,
): CheckoutAddressDetailsValues => {
  const shouldKeepShippingCompanyFields =
    values.useSameAddress && values.isCompanyPurchase;
  const shouldKeepBillingCompanyFields = values.isCompanyPurchase;
  const shipping = shouldKeepShippingCompanyFields
    ? values.shipping
    : clearCheckoutCompanyFields(values.shipping);
  const billingSource = values.useSameAddress ? shipping : values.billing;
  const billing = shouldKeepBillingCompanyFields
    ? billingSource
    : clearCheckoutCompanyFields(billingSource);

  return {
    billing,
    isCompanyPurchase: values.isCompanyPurchase,
    shipping,
    useSameAddress: values.useSameAddress,
  };
};
