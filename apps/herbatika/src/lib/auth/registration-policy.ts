import { normalizeCountryCode } from "@/lib/forms/country-options"
import { passwordHasNumber } from "@/lib/forms/validators/shared"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"

export const REGISTRATION_TERMS_VERSION = "2026-08-21"
export type RegistrationTermsVersion = typeof REGISTRATION_TERMS_VERSION

const REGISTRATION_NAME_MAX_LENGTH = 100
const REGISTRATION_COMPANY_MAX_LENGTH = 255
const REGISTRATION_COMPANY_IDENTIFIER_MAX_LENGTH = 64
const REGISTRATION_POSTAL_CODE_MAX_LENGTH = 12
const REGISTRATION_POSTAL_CODE_DIGITS = {
  cz: 5,
  hu: 4,
  ro: 6,
  sk: 5,
} as const satisfies Record<HerbatikaCountryCode, number>
const REGISTRATION_POSTAL_CODE_PATTERN = /^[0-9\s-]+$/

export type AuthPasswordPolicyViolation = "required" | "min-length" | "number"

export const getAuthPasswordPolicyViolation = (
  password: string
): AuthPasswordPolicyViolation | null => {
  if (!password) {
    return "required"
  }
  if (password.length < 8) {
    return "min-length"
  }
  return passwordHasNumber(password) ? null : "number"
}

const isTrimmedLengthBetween = (
  value: string | undefined,
  min: number,
  max: number
) => {
  const length = value?.trim().length ?? 0
  return length >= min && length <= max
}

export const isRegistrationNameValid = (value: string | undefined) =>
  isTrimmedLengthBetween(value, 2, REGISTRATION_NAME_MAX_LENGTH)

export const isRegistrationCompanyNameValid = (value: string | undefined) =>
  isTrimmedLengthBetween(value, 2, REGISTRATION_COMPANY_MAX_LENGTH)

export const isRegistrationCompanyIdentifierValid = (
  value: string | undefined
) =>
  isTrimmedLengthBetween(value, 4, REGISTRATION_COMPANY_IDENTIFIER_MAX_LENGTH)

export const normalizeRegistrationCountryCode = (
  countryCode: string
): HerbatikaCountryCode | null => {
  const normalized = normalizeCountryCode(countryCode)?.toLowerCase()
  return normalized &&
    Object.hasOwn(REGISTRATION_POSTAL_CODE_DIGITS, normalized)
    ? (normalized as HerbatikaCountryCode)
    : null
}

export const isRegistrationPostalCodeValid = (
  value: string | undefined,
  countryCode: string
) => {
  const normalizedCountryCode = normalizeRegistrationCountryCode(countryCode)
  const normalizedValue = value?.trim() ?? ""
  if (
    !normalizedCountryCode ||
    normalizedValue.length > REGISTRATION_POSTAL_CODE_MAX_LENGTH ||
    !REGISTRATION_POSTAL_CODE_PATTERN.test(normalizedValue)
  ) {
    return false
  }
  return (
    normalizedValue.replace(/\D/g, "").length ===
    REGISTRATION_POSTAL_CODE_DIGITS[normalizedCountryCode]
  )
}

export const isRegistrationTermsAcceptanceValid = (
  accepted: unknown,
  version: unknown
) => accepted === true && version === REGISTRATION_TERMS_VERSION
