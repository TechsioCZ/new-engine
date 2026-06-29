import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"
import type {
  PhoneLiteValidationResult,
  PhoneValidationPolicy,
  PhoneValidationRequest,
  PhoneValidationResult,
  ValidationIssue,
} from "./phone-lite"
import { validatePhoneNumberLite } from "./phone-lite"

export type {
  PhoneInputHints,
  PhoneLiteValidationRequest,
  PhoneLiteValidationResult,
  PhoneLiteValidationStatus,
  PhoneNumberType,
  PhoneServerValidationUsage,
  PhoneStrictValidationLoad,
  PhoneStrictValidationModule,
  PhoneStrictValidator,
  PhoneValidationMode,
  PhoneValidationModeContract,
  PhoneValidationPolicy,
  PhoneValidationRequest,
  PhoneValidationResult,
  ValidationIssue,
} from "./phone-lite"

export const validatePhoneNumber = validatePhoneNumberLite

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
  phone: PhoneValidationResult | PhoneLiteValidationResult
  fieldErrors: Record<"phone", readonly ValidationIssue[]>
}

const TEXT_POSTAL_INPUT_COUNTRIES = new Set<SmartSuggestCountryCode>([
  "CA",
  "GB",
  "IE",
  "MT",
  "NL",
  "US",
])

const NUMERIC_POSTAL_INPUT_COUNTRIES = new Set<SmartSuggestCountryCode>([
  "AT",
  "CZ",
  "DE",
  "HU",
  "PL",
  "RO",
  "SK",
  "US",
])

const POSTAL_CODE_PATTERNS: Partial<Record<SmartSuggestCountryCode, RegExp>> = {
  AT: /^\d{4}$/,
  CA: /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][\s-]?\d[ABCEGHJ-NPRSTV-Z]\d$/i,
  CZ: /^\d{3}\s?\d{2}$/,
  DE: /^\d{5}$/,
  GB: /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i,
  HU: /^\d{4}$/,
  PL: /^\d{2}-?\d{3}$/,
  RO: /^\d{6}$/,
  SK: /^\d{3}\s?\d{2}$/,
  US: /^\d{5}(?:-\d{4})?$/,
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

const digitsOnly = (value: string) => value.replaceAll(/\D/g, "")

const normalizePostalText = (value: string) =>
  value.trim().toUpperCase().replaceAll(/\s+/g, " ")

const isPostalInputShapeAllowed = (
  countryCode: SmartSuggestCountryCode,
  normalizedValue: string
) =>
  !NUMERIC_POSTAL_INPUT_COUNTRIES.has(countryCode) ||
  /^[\d\s-]+$/u.test(normalizedValue)

const isPostalCodeValidForCountry = (
  countryCode: SmartSuggestCountryCode,
  displayValue: string
): PostalValidationStatus => {
  const pattern = POSTAL_CODE_PATTERNS[countryCode]

  if (pattern === undefined) {
    return "unknown"
  }

  return pattern.test(displayValue)
}

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
  const errors: ValidationIssue[] = []

  if (normalizedValue.length === 0) {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue: normalizedValue,
      isValid: false,
      inputHints: getPostalInputHints(countryCode),
      errors: [
        createIssue("postal.required", "postalCode", "Enter a postal code."),
      ],
    }
  }

  if (!isPostalInputShapeAllowed(countryCode, normalizedValue)) {
    return {
      rawInput,
      countryCode,
      normalizedValue,
      displayValue: normalizedValue,
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

  const displayValue = formatPostalDisplayValue(countryCode, rawInput)

  const metadataResult = isPostalCodeValidForCountry(countryCode, displayValue)

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

  if (metadataResult === "unknown") {
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

const toStrictValidationRequiredIssue = (): ValidationIssue =>
  createIssue(
    "phone.strict_validation_required",
    "phone",
    "Strict phone validation is required before this contact can be accepted."
  )

export const validatePacketaContact = (
  request: PacketaContactValidationRequest
): PacketaContactValidationResult => {
  const phoneRequest: PhoneValidationRequest = {
    rawInput: request.phone ?? "",
    requireMobile:
      request.requireMobile ??
      shouldRequireMobileForPacketa(request.deliveryType),
  }

  if (request.defaultCountry !== undefined) {
    phoneRequest.defaultCountry = request.defaultCountry
  }

  if (request.allowedCountries !== undefined) {
    phoneRequest.allowedCountries = request.allowedCountries
  }

  if (request.requireCountryMatch !== undefined) {
    phoneRequest.requireCountryMatch = request.requireCountryMatch
  }

  const phone = validatePhoneNumberLite(phoneRequest)
  const phoneErrors =
    phone.status === "strict_validation_required"
      ? [toStrictValidationRequiredIssue()]
      : phone.errors

  return {
    deliveryType: request.deliveryType,
    isValid: false,
    phone,
    fieldErrors: { phone: phoneErrors },
  }
}
