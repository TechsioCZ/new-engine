import type { AddressData } from "@/types/checkout"

export { COUNTRIES } from "@/lib/checkout-data"

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const DEFAULT_ADDRESS_VALIDATION_OPTIONS: AddressValidationOptions = {
  requireEmail: true,
  requirePhone: true,
}

// Formatters
export const formatPhoneNumber = (value: string): string => {
  const cleaned = value.replaceAll(/\D/gu, "")
  if (cleaned.length === 0) {
    return ""
  }

  // For Czech phone numbers without country code
  if (cleaned.length <= 9) {
    if (cleaned.length <= 3) {
      return cleaned
    }
    if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`
    }
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)}`
  }

  // For international numbers with country code
  const country = cleaned.slice(0, 3)
  const firstPart = cleaned.slice(3, 6)
  const secondPart = cleaned.slice(6, 9)
  const thirdPart = cleaned.slice(9, 12)

  let formatted = "+"
  if (country) {
    formatted += country
  }
  if (firstPart) {
    formatted += ` ${firstPart}`
  }
  if (secondPart) {
    formatted += ` ${secondPart}`
  }
  if (thirdPart) {
    formatted += ` ${thirdPart}`
  }

  return formatted
}

export const formatPostalCode = (value: string): string => {
  const cleaned = value.replaceAll(/\D/gu, "")
  if (cleaned.length <= 3) {
    return cleaned
  }
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)}`
}

// Validators
export const validateEmail = (email: string): boolean => EMAIL_REGEX.test(email)

const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replaceAll(/\D/gu, "")
  return cleaned.length >= 9
}

const validatePostalCode = (postalCode: string): boolean => {
  const cleaned = postalCode.replaceAll(/\D/gu, "")
  return cleaned.length === 5
}

const hasAddressValue = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0

// Validation error messages
export const ADDRESS_ERRORS = {
  city: "Město je povinné",
  email: "Email je povinný",
  emailInvalid: "Neplatný formát emailu",
  firstName: "Jméno je povinné",
  lastName: "Příjmení je povinné",
  phone: "Telefon je povinný",
  phoneInvalid: "Telefon musí mít alespoň 9 číslic",
  postalCode: "PSČ je povinné",
  postalCodeInvalid: "PSČ musí mít 5 číslic",
  street: "Ulice je povinná",
} as const

// Address validation options
export interface AddressValidationOptions {
  // Prefix for error keys (for example, "shipping" or "billing").
  prefix?: string
  requireEmail?: boolean
  requirePhone?: boolean
}

// Universal address validation function
export const validateAddress = (
  address: Partial<AddressData>,
  options: AddressValidationOptions = DEFAULT_ADDRESS_VALIDATION_OPTIONS,
): Record<string, string> => {
  const errors: Record<string, string> = {}
  const prefix = options.prefix ?? ""

  // Required fields for all addresses
  if (!hasAddressValue(address.firstName)) {
    errors[`${prefix}FirstName`] = ADDRESS_ERRORS.firstName
  }
  if (!hasAddressValue(address.lastName)) {
    errors[`${prefix}LastName`] = ADDRESS_ERRORS.lastName
  }
  if (!hasAddressValue(address.street)) {
    errors[`${prefix}Street`] = ADDRESS_ERRORS.street
  }
  if (!hasAddressValue(address.city)) {
    errors[`${prefix}City`] = ADDRESS_ERRORS.city
  }

  // Postal code validation
  if (!hasAddressValue(address.postalCode)) {
    errors[`${prefix}PostalCode`] = ADDRESS_ERRORS.postalCode
  } else if (!validatePostalCode(address.postalCode)) {
    errors[`${prefix}PostalCode`] = ADDRESS_ERRORS.postalCodeInvalid
  }

  // Optional email validation (typically for shipping address)
  if (options.requireEmail === true) {
    if (!hasAddressValue(address.email)) {
      errors[`${prefix}Email`] = ADDRESS_ERRORS.email
    } else if (!validateEmail(address.email)) {
      errors[`${prefix}Email`] = ADDRESS_ERRORS.emailInvalid
    }
  }

  // Optional phone validation (typically for shipping address)
  if (options.requirePhone === true) {
    if (!hasAddressValue(address.phone)) {
      errors[`${prefix}Phone`] = ADDRESS_ERRORS.phone
    } else if (!validatePhone(address.phone)) {
      errors[`${prefix}Phone`] = ADDRESS_ERRORS.phoneInvalid
    }
  }

  return errors
}
