import { hasTrimmedString } from "@techsio/std/string"

import { VALIDATION_MESSAGES } from "@/lib/validation-messages"

export interface AddressFormData {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone?: string
}

type AddressFieldKey = keyof AddressFormData
export type AddressErrors = Partial<Record<AddressFieldKey, string>>

const ADDRESS_VALIDATION_RULES = {
  address_1: {
    minLength: { message: VALIDATION_MESSAGES.address.minLength, value: 3 },
    required: VALIDATION_MESSAGES.address.required,
  },
  city: {
    minLength: { message: VALIDATION_MESSAGES.city.minLength, value: 2 },
    required: VALIDATION_MESSAGES.city.required,
  },
  country_code: {
    required: VALIDATION_MESSAGES.country.required,
  },
  first_name: {
    minLength: { message: VALIDATION_MESSAGES.firstName.minLength, value: 2 },
    required: VALIDATION_MESSAGES.firstName.required,
  },
  last_name: {
    minLength: { message: VALIDATION_MESSAGES.lastName.minLength, value: 2 },
    required: VALIDATION_MESSAGES.lastName.required,
  },
  phone: {
    pattern: {
      message: VALIDATION_MESSAGES.phone.invalid,
      value: /^(?:\+420\s)?\d{3}\s\d{3}\s\d{3}$|^$/u,
    },
  },
  postal_code: {
    pattern: {
      message: VALIDATION_MESSAGES.postalCode.invalid,
      value: /^\d{3}\s\d{2}$/u,
    },
    required: VALIDATION_MESSAGES.postalCode.required,
  },
} as const

const REQUIRED_ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "address_1",
  "city",
  "postal_code",
  "country_code",
] as const satisfies readonly AddressFieldKey[]

const validateRequiredLength = (
  value: string,
  rule: { required: string; minLength: { value: number; message: string } },
): string | undefined => {
  if (!hasTrimmedString(value)) {
    return rule.required
  }
  return value.length < rule.minLength.value
    ? rule.minLength.message
    : undefined
}

const validateRequired = (
  value: string,
  message: string,
): string | undefined => (hasTrimmedString(value) ? undefined : message)

const validatePostalCode = (value: string): string | undefined => {
  const requiredError = validateRequired(
    value,
    ADDRESS_VALIDATION_RULES.postal_code.required,
  )
  if (requiredError !== undefined) {
    return requiredError
  }
  return ADDRESS_VALIDATION_RULES.postal_code.pattern.value.test(value)
    ? undefined
    : ADDRESS_VALIDATION_RULES.postal_code.pattern.message
}

const validatePhone = (value: string): string | undefined =>
  value === "" || ADDRESS_VALIDATION_RULES.phone.pattern.value.test(value)
    ? undefined
    : ADDRESS_VALIDATION_RULES.phone.pattern.message

type OptionalAddressField = "address_2" | "company" | "province"
const OPTIONAL_ADDRESS_ERRORS: Partial<Record<OptionalAddressField, string>> =
  {}

const validateAddressLine = (value: string): string | undefined =>
  validateRequiredLength(value, ADDRESS_VALIDATION_RULES.address_1)
const validateCity = (value: string): string | undefined =>
  validateRequiredLength(value, ADDRESS_VALIDATION_RULES.city)
const validateCountryCode = (value: string): string | undefined =>
  validateRequired(value, ADDRESS_VALIDATION_RULES.country_code.required)
const validateFirstName = (value: string): string | undefined =>
  validateRequiredLength(value, ADDRESS_VALIDATION_RULES.first_name)
const validateLastName = (value: string): string | undefined =>
  validateRequiredLength(value, ADDRESS_VALIDATION_RULES.last_name)

const ADDRESS_FIELD_VALIDATORS: Record<
  Exclude<AddressFieldKey, OptionalAddressField>,
  (value: string) => string | undefined
> = {
  address_1: validateAddressLine,
  city: validateCity,
  country_code: validateCountryCode,
  first_name: validateFirstName,
  last_name: validateLastName,
  phone: validatePhone,
  postal_code: validatePostalCode,
}

const validateAddressField = (
  field: AddressFieldKey,
  value: string,
): string | undefined => {
  if (field === "address_2" || field === "company" || field === "province") {
    return OPTIONAL_ADDRESS_ERRORS[field]
  }
  return ADDRESS_FIELD_VALIDATORS[field](value)
}

export const validateAddressForm = (data: AddressFormData): AddressErrors => {
  const errors: AddressErrors = {}

  for (const field of REQUIRED_ADDRESS_FIELDS) {
    const fieldValue = data[field]
    const error = validateAddressField(field, fieldValue)
    if (error !== null && error !== undefined && error !== "") {
      errors[field] = error
    }
  }

  if (data.phone !== null && data.phone !== undefined && data.phone !== "") {
    const phoneError = validateAddressField("phone", data.phone)
    if (phoneError !== null && phoneError !== undefined && phoneError !== "") {
      errors.phone = phoneError
    }
  }

  return errors
}
