import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"
import {
  isSupportedCountry,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from "libphonenumber-js/max"

import type {
  PhoneNumberType,
  PhoneValidationRequest,
  PhoneValidationResult,
  ValidationIssue,
} from "./phone-lite"

const MOBILE_PHONE_TYPES = new Set<PhoneNumberType>([
  "MOBILE",
  "FIXED_LINE_OR_MOBILE",
])

const normalizeCountryCode = (countryCode: string | undefined) =>
  countryCode?.trim()
    ? (countryCode.trim().toUpperCase() as SmartSuggestCountryCode)
    : undefined

const toSupportedPhoneCountry = (
  countryCode: SmartSuggestCountryCode | undefined
) => {
  if (countryCode === undefined) {
    return
  }

  return isSupportedCountry(countryCode) ? countryCode : undefined
}

const createIssue = (
  code: string,
  field: string,
  message: string
): ValidationIssue => ({
  code,
  field,
  message,
})

const mapPhoneLengthIssue = (
  lengthIssue: ReturnType<typeof validatePhoneNumberLength>
) => {
  switch (lengthIssue) {
    case "INVALID_COUNTRY":
      return createIssue(
        "phone.country_unsupported",
        "phone",
        "The phone country is not supported by the phone metadata."
      )
    case "NOT_A_NUMBER":
      return createIssue("phone.not_a_number", "phone", "Enter a phone number.")
    case "TOO_SHORT":
      return createIssue(
        "phone.too_short",
        "phone",
        "The phone number is too short."
      )
    case "TOO_LONG":
      return createIssue(
        "phone.too_long",
        "phone",
        "The phone number is too long."
      )
    case "INVALID_LENGTH":
      return createIssue(
        "phone.invalid_length",
        "phone",
        "The phone number has an invalid length."
      )
    default:
      return createIssue(
        "phone.invalid",
        "phone",
        "Enter a valid phone number."
      )
  }
}

const uniqueIssues = (issues: readonly ValidationIssue[]) => {
  const seen = new Set<string>()

  return issues.filter((issue) => {
    const key = `${issue.field}:${issue.code}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

const normalizeAllowedCountries = (
  allowedCountries: readonly SmartSuggestCountryCode[] | undefined
) => {
  const normalizedCountries = allowedCountries
    ?.map(normalizeCountryCode)
    .filter((countryCode) => countryCode !== undefined)

  return normalizedCountries === undefined || normalizedCountries.length === 0
    ? undefined
    : normalizedCountries
}

export const validatePhoneNumber = (
  request: PhoneValidationRequest
): PhoneValidationResult => {
  const rawInput = request.rawInput
  const trimmedInput = rawInput.trim()
  const defaultCountry = normalizeCountryCode(request.defaultCountry)
  const supportedDefaultCountry = toSupportedPhoneCountry(defaultCountry)
  const errors: ValidationIssue[] = []

  if (trimmedInput.length === 0) {
    return {
      rawInput,
      displayValue: rawInput,
      isPossible: false,
      isValid: false,
      errors: [createIssue("phone.required", "phone", "Enter a phone number.")],
    }
  }

  const parsedPhone = parsePhoneNumberFromString(
    trimmedInput,
    supportedDefaultCountry
  )

  if (parsedPhone === undefined) {
    const lengthIssue = validatePhoneNumberLength(
      trimmedInput,
      supportedDefaultCountry
    )

    return {
      rawInput,
      displayValue: trimmedInput,
      isPossible: false,
      isValid: false,
      errors: [mapPhoneLengthIssue(lengthIssue)],
    }
  }

  const detectedCountry = normalizeCountryCode(parsedPhone.country)
  const type = parsedPhone.getType()
  const isPossible = parsedPhone.isPossible()
  const isValidMetadata = parsedPhone.isValid()
  const allowedCountries = normalizeAllowedCountries(request.allowedCountries)

  if (!(isPossible && isValidMetadata)) {
    const lengthIssue = validatePhoneNumberLength(
      trimmedInput,
      supportedDefaultCountry
    )
    errors.push(mapPhoneLengthIssue(lengthIssue))
  }

  if (
    allowedCountries !== undefined &&
    detectedCountry !== undefined &&
    !allowedCountries.includes(detectedCountry)
  ) {
    errors.push(
      createIssue(
        "phone.country_not_allowed",
        "phone",
        "The phone number country is not allowed."
      )
    )
  }

  if (
    request.requireCountryMatch === true &&
    defaultCountry !== undefined &&
    detectedCountry !== undefined &&
    detectedCountry !== defaultCountry
  ) {
    errors.push(
      createIssue(
        "phone.country_mismatch",
        "phone",
        "The phone number country does not match the selected country."
      )
    )
  }

  if (
    request.requireMobile === true &&
    (type === undefined || !MOBILE_PHONE_TYPES.has(type))
  ) {
    errors.push(
      createIssue(
        "phone.mobile_required",
        "phone",
        "Enter a mobile phone number."
      )
    )
  }

  const isValid = isValidMetadata && errors.length === 0

  const result: PhoneValidationResult = {
    rawInput,
    displayValue: parsedPhone.formatInternational(),
    callingCode: parsedPhone.countryCallingCode,
    nationalNumber: parsedPhone.nationalNumber,
    isPossible,
    isValid,
    errors: uniqueIssues(errors),
  }

  if (isValid) {
    result.e164 = parsedPhone.number
  }

  if (detectedCountry !== undefined) {
    result.detectedCountry = detectedCountry
  }

  if (type !== undefined) {
    result.type = type
  }

  return result
}
