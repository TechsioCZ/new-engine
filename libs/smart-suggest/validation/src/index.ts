import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"
import {
  isSupportedCountry,
  type PhoneNumberType,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
} from "libphonenumber-js/max"
import { validate as validatePostalCodeWithMetadata } from "postal-codes-js"

export type ValidationIssue = {
  code: string
  field: string
  message: string
}

export type PhoneValidationPolicy = {
  allowedCountries?: readonly SmartSuggestCountryCode[]
  requireMobile?: boolean
  requireCountryMatch?: boolean
}

export type PhoneValidationRequest = PhoneValidationPolicy & {
  rawInput: string
  defaultCountry?: SmartSuggestCountryCode
}

export type PhoneValidationResult = {
  rawInput: string
  displayValue: string
  e164?: string
  detectedCountry?: SmartSuggestCountryCode
  callingCode?: string
  nationalNumber?: string
  type?: PhoneNumberType
  isPossible: boolean
  isValid: boolean
  errors: ValidationIssue[]
}

export type PostalValidationStatus = boolean | "unknown"

export type PostalValidationRequest = {
  rawInput: string
  countryCode: SmartSuggestCountryCode
}

export type PostalInputHints = {
  autoComplete: "postal-code"
  inputMode: "numeric" | "text"
}

export type PostalValidationResult = {
  rawInput: string
  countryCode: SmartSuggestCountryCode
  normalizedValue: string
  displayValue: string
  isValid: PostalValidationStatus
  inputHints: PostalInputHints
  errors: ValidationIssue[]
}

export type PacketaDeliveryType = "home-delivery" | "pickup-point"

export type PacketaValidationPolicy = PhoneValidationPolicy & {
  deliveryType: PacketaDeliveryType
}

export type PacketaContactValidationRequest = PacketaValidationPolicy & {
  phone?: string
  defaultCountry?: SmartSuggestCountryCode
}

export type PacketaContactValidationResult = {
  deliveryType: PacketaDeliveryType
  isValid: boolean
  phone: PhoneValidationResult
  fieldErrors: Record<"phone", readonly ValidationIssue[]>
}

const MOBILE_PHONE_TYPES = new Set<PhoneNumberType>([
  "MOBILE",
  "FIXED_LINE_OR_MOBILE",
])

const TEXT_POSTAL_INPUT_COUNTRIES = new Set<SmartSuggestCountryCode>([
  "CA",
  "GB",
  "IE",
  "MT",
  "NL",
  "US",
])

const normalizeCountryCode = (countryCode: string | undefined) =>
  countryCode?.trim().toUpperCase() as SmartSuggestCountryCode | undefined

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
): ValidationIssue => ({ code, field, message })

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
) =>
  allowedCountries?.map((countryCode) => countryCode.trim().toUpperCase()) as
    | SmartSuggestCountryCode[]
    | undefined

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

  return {
    rawInput,
    displayValue: parsedPhone.formatInternational(),
    e164: isValid ? parsedPhone.number : undefined,
    detectedCountry,
    callingCode: parsedPhone.countryCallingCode,
    nationalNumber: parsedPhone.nationalNumber,
    type,
    isPossible,
    isValid,
    errors: uniqueIssues(errors),
  }
}

const digitsOnly = (value: string) => value.replaceAll(/\D/g, "")

const normalizePostalText = (value: string) =>
  value.trim().toUpperCase().replaceAll(/\s+/g, " ")

const formatPostalDisplayValue = (
  countryCode: SmartSuggestCountryCode,
  value: string
) => {
  const normalizedText = normalizePostalText(value)
  const digits = digitsOnly(normalizedText)

  if ((countryCode === "CZ" || countryCode === "SK") && digits.length === 5) {
    return `${digits.slice(0, 3)} ${digits.slice(3)}`
  }

  if (countryCode === "PL" && digits.length === 5) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`
  }

  if (countryCode === "US" && digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`
  }

  if (countryCode === "CA") {
    const compact = normalizedText.replaceAll(/[\s-]/g, "")

    if (compact.length === 6) {
      return `${compact.slice(0, 3)} ${compact.slice(3)}`
    }
  }

  if (countryCode === "GB") {
    const compact = normalizedText.replaceAll(/\s/g, "")

    if (compact.length > 3) {
      return `${compact.slice(0, -3)} ${compact.slice(-3)}`
    }
  }

  return normalizedText
}

export const getPostalInputHints = (
  countryCode: SmartSuggestCountryCode
): PostalInputHints => ({
  autoComplete: "postal-code",
  inputMode: TEXT_POSTAL_INPUT_COUNTRIES.has(countryCode) ? "text" : "numeric",
})

export const validatePostalCode = (
  request: PostalValidationRequest
): PostalValidationResult => {
  const rawInput = request.rawInput
  const countryCode = request.countryCode
    .trim()
    .toUpperCase() as SmartSuggestCountryCode
  const normalizedValue = normalizePostalText(rawInput)
  const displayValue = formatPostalDisplayValue(countryCode, rawInput)
  const errors: ValidationIssue[] = []

  if (normalizedValue.length === 0) {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue,
      isValid: false,
      inputHints: getPostalInputHints(countryCode),
      errors: [
        createIssue("postal.required", "postalCode", "Enter a postal code."),
      ],
    }
  }

  const metadataResult = validatePostalCodeWithMetadata(
    countryCode,
    displayValue
  )

  if (metadataResult === true) {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue,
      isValid: true,
      inputHints: getPostalInputHints(countryCode),
      errors,
    }
  }

  if (
    typeof metadataResult === "string" &&
    metadataResult.startsWith("Unknown alpha2/alpha3 country code")
  ) {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue,
      isValid: "unknown",
      inputHints: getPostalInputHints(countryCode),
      errors: [
        createIssue(
          "postal.country_unsupported",
          "postalCode",
          "Postal-code metadata is not available for this country."
        ),
      ],
    }
  }

  return {
    rawInput,
    countryCode,
    normalizedValue,
    displayValue,
    isValid: false,
    inputHints: getPostalInputHints(countryCode),
    errors: [
      createIssue(
        "postal.invalid",
        "postalCode",
        "Enter a valid postal code for the selected country."
      ),
    ],
  }
}

const shouldRequireMobileForPacketa = (deliveryType: PacketaDeliveryType) =>
  deliveryType === "pickup-point"

export const validatePacketaContact = (
  request: PacketaContactValidationRequest
): PacketaContactValidationResult => {
  const phone = validatePhoneNumber({
    rawInput: request.phone ?? "",
    defaultCountry: request.defaultCountry,
    allowedCountries: request.allowedCountries,
    requireCountryMatch: request.requireCountryMatch,
    requireMobile:
      request.requireMobile ??
      shouldRequireMobileForPacketa(request.deliveryType),
  })

  return {
    deliveryType: request.deliveryType,
    isValid: phone.isValid,
    phone,
    fieldErrors: { phone: phone.errors },
  }
}
