import {
  validatePhoneNumber,
  validatePostalCode as validateSmartSuggestPostalCode,
} from "@techsio/smart-suggest-validation"
import type {
  CheckoutAddressValues,
  CheckoutDetailsValues,
} from "@/lib/forms/checkout/address.form"
import { normalizeCountryCode } from "@/lib/forms/country-options"
import { createChangeBlurSubmitScopedFieldValidators } from "@/lib/forms/validators/field-validator-factories"
import {
  validateCustomerName,
  validateEmailAddress,
} from "@/lib/forms/validators/shared"

type CheckoutAddressField = keyof CheckoutAddressValues
type CheckoutAddressFieldValidator = (value: string) => string | undefined

const CHECKOUT_COUNTRIES = ["SK", "CZ", "AT", "HU"] as const

const validateBillingFields = (values: CheckoutDetailsValues) =>
  !values.useSameAddress

const validateShippingCompanyFields = (values: CheckoutDetailsValues) =>
  values.useSameAddress && values.isCompanyPurchase

const validateBillingCompanyFields = (values: CheckoutDetailsValues) =>
  !values.useSameAddress && values.isCompanyPurchase

const createRequiredTextValidator =
  (
    emptyMessage: string,
    invalidMessage: string,
    minLength = 2
  ): CheckoutAddressFieldValidator =>
  (value) => {
    const normalized = value.trim()

    if (!normalized) {
      return emptyMessage
    }

    if (normalized.length < minLength) {
      return invalidMessage
    }

    return
  }

const validateRequiredPhoneNumber: CheckoutAddressFieldValidator = (value) => {
  if (!value.trim()) {
    return "Zadajte telefón."
  }

  const validation = validatePhoneNumber({
    allowedCountries: CHECKOUT_COUNTRIES,
    defaultCountry: "SK",
    rawInput: value,
  })

  return validation.isValid ? undefined : "Zadajte platné telefónne číslo."
}

const validatePostalCode: CheckoutAddressFieldValidator = (value) => {
  const normalized = value.trim()

  if (!normalized) {
    return "Zadajte PSČ."
  }

  const supportedCountryResults = CHECKOUT_COUNTRIES.map((countryCode) =>
    validateSmartSuggestPostalCode({ countryCode, rawInput: normalized })
  )

  if (
    supportedCountryResults.some(
      (result) => result.isValid === true || result.isValid === "unknown"
    )
  ) {
    return
  }

  return "Zadajte platné PSČ."
}

const validateCountryCode: CheckoutAddressFieldValidator = (value) => {
  if (!value.trim()) {
    return "Vyberte krajinu."
  }

  if (!normalizeCountryCode(value)) {
    return "Vyberte platnú krajinu."
  }

  return
}

const validateCompanyName = createRequiredTextValidator(
  "Zadajte názov firmy.",
  "Názov firmy musí mať aspoň 2 znaky."
)

const validateCompanyIdentifier = (value: string, label: "DIČ" | "IČO") => {
  const normalized = value.trim()

  if (!normalized) {
    return `Zadajte ${label}.`
  }

  if (normalized.length < 4) {
    return `${label} musí mať aspoň 4 znaky.`
  }

  return
}

export const checkoutAddressFieldValidators = {
  address1: createRequiredTextValidator(
    "Zadajte ulicu a číslo domu.",
    "Ulica a číslo domu musí mať aspoň 2 znaky."
  ),
  city: createRequiredTextValidator(
    "Zadajte mesto.",
    "Mesto musí mať aspoň 2 znaky."
  ),
  company: validateCompanyName,
  companyId: (value: string) => validateCompanyIdentifier(value, "IČO"),
  countryCode: validateCountryCode,
  email: validateEmailAddress,
  firstName: (value: string) => validateCustomerName(value, "Meno"),
  lastName: (value: string) => validateCustomerName(value, "Priezvisko"),
  phone: validateRequiredPhoneNumber,
  postalCode: validatePostalCode,
  taxId: (value: string) => validateCompanyIdentifier(value, "DIČ"),
} as const satisfies Partial<
  Record<CheckoutAddressField, CheckoutAddressFieldValidator>
>

const shippingFieldValidators = {
  address1: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.address1
  ),
  city: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.city
  ),
  company: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.company,
    validateShippingCompanyFields
  ),
  companyId: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.companyId,
    validateShippingCompanyFields
  ),
  countryCode: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.countryCode
  ),
  email: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.email
  ),
  firstName: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.firstName
  ),
  lastName: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.lastName
  ),
  phone: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.phone
  ),
  postalCode: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.postalCode
  ),
  taxId: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.taxId,
    validateShippingCompanyFields
  ),
} as const

const billingFieldValidators = {
  address1: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.address1,
    validateBillingFields
  ),
  city: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.city,
    validateBillingFields
  ),
  company: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.company,
    validateBillingCompanyFields
  ),
  companyId: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.companyId,
    validateBillingCompanyFields
  ),
  countryCode: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.countryCode,
    validateBillingFields
  ),
  firstName: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.firstName,
    validateBillingFields
  ),
  lastName: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.lastName,
    validateBillingFields
  ),
  postalCode: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.postalCode,
    validateBillingFields
  ),
  taxId: createChangeBlurSubmitScopedFieldValidators(
    checkoutAddressFieldValidators.taxId,
    validateBillingCompanyFields
  ),
} as const

export const checkoutFieldValidators = {
  billing: billingFieldValidators,
  shipping: shippingFieldValidators,
} as const
