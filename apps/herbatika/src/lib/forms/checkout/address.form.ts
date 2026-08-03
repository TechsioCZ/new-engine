export type CheckoutAddressValues = {
  email: string
  firstName: string
  lastName: string
  phone: string
  company: string
  companyId: string
  taxId: string
  vatId: string
  address1: string
  address2: string
  city: string
  postalCode: string
  countryCode: string
  customerNote: string
}

export type CheckoutDetailsValues = {
  shipping: CheckoutAddressValues
  billing: CheckoutAddressValues
  useSameAddress: boolean
  isCompanyPurchase: boolean
  accountSetupRequested: boolean
  marketingConsent: boolean
  heurekaConsent: boolean
}

export type CheckoutAddressDetailsValues = Pick<
  CheckoutDetailsValues,
  "billing" | "isCompanyPurchase" | "shipping" | "useSameAddress"
>

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
] as const satisfies ReadonlyArray<keyof CheckoutAddressValues>

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
}

const clearCheckoutCompanyFields = (
  address: CheckoutAddressValues
): CheckoutAddressValues => ({
  ...address,
  company: "",
  companyId: "",
  taxId: "",
  vatId: "",
})

export const resolveEffectiveCheckoutAddressDetails = (
  values: CheckoutAddressDetailsValues
): CheckoutAddressDetailsValues => {
  const shouldKeepShippingCompanyFields =
    values.useSameAddress && values.isCompanyPurchase
  const shouldKeepBillingCompanyFields = values.isCompanyPurchase
  const shipping = shouldKeepShippingCompanyFields
    ? values.shipping
    : clearCheckoutCompanyFields(values.shipping)
  const billingSource = values.useSameAddress ? shipping : values.billing
  const billing = shouldKeepBillingCompanyFields
    ? billingSource
    : clearCheckoutCompanyFields(billingSource)

  return {
    billing,
    isCompanyPurchase: values.isCompanyPurchase,
    shipping,
    useSameAddress: values.useSameAddress,
  }
}
