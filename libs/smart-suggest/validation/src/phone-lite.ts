import type { SmartSuggestCountryCode } from "@techsio/smart-suggest-core"

export type ValidationIssue = {
  code: string
  field: string
  message: string
}

export type PhoneNumberType =
  | "PREMIUM_RATE"
  | "TOLL_FREE"
  | "SHARED_COST"
  | "VOIP"
  | "PERSONAL_NUMBER"
  | "PAGER"
  | "UAN"
  | "VOICEMAIL"
  | "FIXED_LINE_OR_MOBILE"
  | "FIXED_LINE"
  | "MOBILE"

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

export type PhoneStrictValidator = (
  request: PhoneValidationRequest
) => PhoneValidationResult

export type PhoneStrictValidationModule = {
  validatePhoneNumber: PhoneStrictValidator
}

export type PhoneValidationMode =
  | "server-only"
  | "frontend-lazy"
  | "frontend-immediate"

export type PhoneStrictValidationLoad = "none" | "lazy" | "immediate"

export type PhoneServerValidationUsage = "required" | "fallback" | "optional"

export type PhoneValidationModeContract = {
  mode: PhoneValidationMode
  strictValidationLoad: PhoneStrictValidationLoad
  serverValidation: PhoneServerValidationUsage
  usesLiteValidationFirst: boolean
}

export type PhoneInputHints = {
  type: "tel"
  autoComplete: "tel"
  inputMode: "tel"
}

export type PhoneLiteValidationStatus =
  | "empty"
  | "malformed"
  | "too_short"
  | "too_long"
  | "strict_validation_required"

export type PhoneLiteValidationRequest = PhoneValidationRequest

export type PhoneLiteValidationResult = {
  rawInput: string
  displayValue: string
  normalizedDigits: string
  status: PhoneLiteValidationStatus
  canAttemptStrictValidation: boolean
  requiresStrictValidation: boolean
  inputHints: PhoneInputHints
  errors: ValidationIssue[]
}

export const PHONE_VALIDATION_MODES = [
  "server-only",
  "frontend-lazy",
  "frontend-immediate",
] as const satisfies readonly PhoneValidationMode[]

export const DEFAULT_PHONE_VALIDATION_MODE: PhoneValidationMode = "server-only"

export const PHONE_VALIDATION_MODE_CONTRACTS = {
  "server-only": {
    mode: "server-only",
    strictValidationLoad: "none",
    serverValidation: "required",
    usesLiteValidationFirst: true,
  },
  "frontend-lazy": {
    mode: "frontend-lazy",
    strictValidationLoad: "lazy",
    serverValidation: "fallback",
    usesLiteValidationFirst: true,
  },
  "frontend-immediate": {
    mode: "frontend-immediate",
    strictValidationLoad: "immediate",
    serverValidation: "optional",
    usesLiteValidationFirst: false,
  },
} as const satisfies Record<PhoneValidationMode, PhoneValidationModeContract>

const PHONE_VALIDATION_MODE_SET: ReadonlySet<string> = new Set(
  PHONE_VALIDATION_MODES
)

const MIN_LITE_PHONE_DIGITS = 4
const MAX_LITE_PHONE_DIGITS = 18
const PHONE_LITE_ALLOWED_CHARACTERS = /^[+\d\s().-]+$/u

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

const hasInvalidPlusPlacement = (value: string) => {
  const firstPlusIndex = value.indexOf("+")

  if (firstPlusIndex === -1) {
    return false
  }

  return firstPlusIndex !== 0 || value.indexOf("+", firstPlusIndex + 1) !== -1
}

const createLiteResult = (
  request: PhoneLiteValidationRequest,
  status: PhoneLiteValidationStatus,
  errors: readonly ValidationIssue[]
): PhoneLiteValidationResult => {
  const normalizedDigits = digitsOnly(request.rawInput)
  const canAttemptStrictValidation = status === "strict_validation_required"

  return {
    rawInput: request.rawInput,
    displayValue: request.rawInput.trim(),
    normalizedDigits,
    status,
    canAttemptStrictValidation,
    requiresStrictValidation: canAttemptStrictValidation,
    inputHints: getPhoneInputHints(),
    errors: [...errors],
  }
}

export const isPhoneValidationMode = (
  value: unknown
): value is PhoneValidationMode =>
  typeof value === "string" && PHONE_VALIDATION_MODE_SET.has(value)

export const getPhoneValidationModeContract = (
  mode: PhoneValidationMode = DEFAULT_PHONE_VALIDATION_MODE
): PhoneValidationModeContract => PHONE_VALIDATION_MODE_CONTRACTS[mode]

export const getPhoneInputHints = (): PhoneInputHints => ({
  type: "tel",
  autoComplete: "tel",
  inputMode: "tel",
})

export const validatePhoneNumberLite = (
  request: PhoneLiteValidationRequest
): PhoneLiteValidationResult => {
  const trimmedInput = request.rawInput.trim()
  const normalizedDigits = digitsOnly(trimmedInput)

  if (trimmedInput.length === 0) {
    return createLiteResult(request, "empty", [
      createIssue("phone.required", "phone", "Enter a phone number."),
    ])
  }

  if (
    !PHONE_LITE_ALLOWED_CHARACTERS.test(trimmedInput) ||
    hasInvalidPlusPlacement(trimmedInput)
  ) {
    return createLiteResult(request, "malformed", [
      createIssue(
        "phone.invalid_shape",
        "phone",
        "Enter a phone number using digits and phone punctuation."
      ),
    ])
  }

  if (normalizedDigits.length < MIN_LITE_PHONE_DIGITS) {
    return createLiteResult(request, "too_short", [
      createIssue("phone.too_short", "phone", "The phone number is too short."),
    ])
  }

  if (normalizedDigits.length > MAX_LITE_PHONE_DIGITS) {
    return createLiteResult(request, "too_long", [
      createIssue("phone.too_long", "phone", "The phone number is too long."),
    ])
  }

  return createLiteResult(request, "strict_validation_required", [])
}

export type LiteResultToPhoneValidationResultOptions = {
  // When true, returns undefined for `strict_validation_required` so callers
  // that defer strict validation to a server/strict validator can suppress the
  // lite result entirely. Defaults to false (always return a result).
  omitWhenStrictValidationRequired?: boolean
}

// Single canonical converter from a lite phone result to the public
// PhoneValidationResult shape. `isPossible` mirrors the lite result's
// `canAttemptStrictValidation` flag, and `isValid` is always false because the
// lite pass never confirms validity.
export function liteResultToPhoneValidationResult(
  liteResult: PhoneLiteValidationResult,
  options: LiteResultToPhoneValidationResultOptions & {
    omitWhenStrictValidationRequired: true
  }
): PhoneValidationResult | undefined
export function liteResultToPhoneValidationResult(
  liteResult: PhoneLiteValidationResult,
  options?: LiteResultToPhoneValidationResultOptions
): PhoneValidationResult
export function liteResultToPhoneValidationResult(
  liteResult: PhoneLiteValidationResult,
  options?: LiteResultToPhoneValidationResultOptions
): PhoneValidationResult | undefined {
  if (
    options?.omitWhenStrictValidationRequired === true &&
    liteResult.status === "strict_validation_required"
  ) {
    return
  }

  return {
    rawInput: liteResult.rawInput,
    displayValue: liteResult.displayValue,
    isPossible: liteResult.canAttemptStrictValidation,
    isValid: false,
    errors: liteResult.errors,
  }
}
