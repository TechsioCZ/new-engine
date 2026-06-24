import { getHerbatikaAddressCountryRule } from "./address-country-rules"

const POSTAL_CODE_ALLOWED_PATTERN = /^[0-9\s-]+$/

export type PostalCodeValidationIssue =
  | "invalid_characters"
  | "invalid_country"
  | "invalid_length"
  | "required"

export type PostalCodeValidationResult =
  | {
      formattedValue: string
      issue?: never
      message?: never
      normalizedDigits: string
      valid: true
    }
  | {
      formattedValue?: never
      issue: PostalCodeValidationIssue
      message: string
      normalizedDigits?: string
      valid: false
    }

export const normalizePostalCodeDigits = (value: string) =>
  value.trim().replace(/[\s-]+/g, "")

export const formatPostalCodeForCountry = (
  value: string,
  countryCode: string | null | undefined
) => {
  const rule = getHerbatikaAddressCountryRule(countryCode)
  const normalizedDigits = normalizePostalCodeDigits(value)

  if (!rule || normalizedDigits.length !== rule.postalCode.digitCount) {
    return null
  }

  const groupAfterDigit =
    "groupAfterDigit" in rule.postalCode
      ? rule.postalCode.groupAfterDigit
      : undefined
  if (!groupAfterDigit) {
    return normalizedDigits
  }

  return `${normalizedDigits.slice(0, groupAfterDigit)} ${normalizedDigits.slice(
    groupAfterDigit
  )}`
}

export const validatePostalCodeForCountry = (
  value: string,
  countryCode: string | null | undefined
): PostalCodeValidationResult => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return {
      issue: "required",
      message: "Zadajte PSČ.",
      valid: false,
    }
  }

  if (!POSTAL_CODE_ALLOWED_PATTERN.test(trimmedValue)) {
    return {
      issue: "invalid_characters",
      message: "Zadajte platné PSČ.",
      valid: false,
    }
  }

  const rule = getHerbatikaAddressCountryRule(countryCode)
  if (!rule) {
    return {
      issue: "invalid_country",
      message: "Vyberte krajinu.",
      valid: false,
    }
  }

  const normalizedDigits = normalizePostalCodeDigits(trimmedValue)
  if (normalizedDigits.length !== rule.postalCode.digitCount) {
    return {
      issue: "invalid_length",
      message: `PSČ pre ${rule.label} musí obsahovať ${rule.postalCode.digitCount} číslic. Príklad: ${rule.postalCode.example}.`,
      normalizedDigits,
      valid: false,
    }
  }

  return {
    formattedValue: formatPostalCodeForCountry(trimmedValue, rule.code) ?? "",
    normalizedDigits,
    valid: true,
  }
}
