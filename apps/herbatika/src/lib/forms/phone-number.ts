import {
  getPhoneInputValueDetails,
  type PhoneInputCountry,
  type PhoneInputValueChangeDetails,
} from "@techsio/ui-kit/molecules/phone-input"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"

const PHONE_COUNTRY_CODE_BY_MARKET = {
  sk: "SK",
  cz: "CZ",
  hu: "HU",
  ro: "RO",
} as const satisfies Record<HerbatikaCountryCode, PhoneInputCountry["value"]>

export const HERBATIKA_PHONE_COUNTRY_CODES = Object.values(
  PHONE_COUNTRY_CODE_BY_MARKET
)

export type HerbatikaPhoneCountryCode =
  (typeof HERBATIKA_PHONE_COUNTRY_CODES)[number]

type PhoneNumberAnalysis = {
  details?: PhoneInputValueChangeDetails
  isValid: boolean
}

const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRY_CODE_BY_MARKET.sk
const PHONE_ALLOWED_REGEX = /^\+?[0-9\s()-]+$/

export const normalizeHerbatikaPhoneCountryCode = (
  value: string | null | undefined
): HerbatikaPhoneCountryCode | undefined => {
  const normalized = value?.trim().toUpperCase()

  return HERBATIKA_PHONE_COUNTRY_CODES.find(
    (countryCode) => countryCode === normalized
  )
}

const resolveInternationalPhoneCountry = (value: string) => {
  if (!value.startsWith("+")) {
    return
  }

  return HERBATIKA_PHONE_COUNTRY_CODES.find(
    (countryCode) =>
      getPhoneInputValueDetails(value, countryCode).nationalNumber.length > 0
  )
}

const resolvePhoneValueDetails = (
  value: string,
  fallbackCountryCode: string | null | undefined
) => {
  const explicitCountry = resolveInternationalPhoneCountry(value)
  const country =
    explicitCountry ??
    normalizeHerbatikaPhoneCountryCode(fallbackCountryCode) ??
    DEFAULT_PHONE_COUNTRY

  return {
    details: getPhoneInputValueDetails(value, country),
    hasSupportedCountry: !value.startsWith("+") || Boolean(explicitCountry),
  }
}

const analyzePhoneNumber = (
  value: string,
  fallbackCountryCode: string | null | undefined
): PhoneNumberAnalysis => {
  const normalized = value.trim()

  if (!PHONE_ALLOWED_REGEX.test(normalized)) {
    return { isValid: false }
  }

  const result = resolvePhoneValueDetails(normalized, fallbackCountryCode)

  return {
    details: result.details,
    isValid: result.hasSupportedCountry && result.details.isValid,
  }
}

export const createOptionalPhoneNumberValidator =
  (invalidMessage: string, fallbackCountryCode?: string | null) =>
  (value: string) => {
    if (!value.trim()) {
      return
    }

    return analyzePhoneNumber(value, fallbackCountryCode).isValid
      ? undefined
      : invalidMessage
  }

export const isValidPhoneNumber = (
  value: string | null | undefined,
  fallbackCountryCode?: string | null
) =>
  Boolean(
    value?.trim() && analyzePhoneNumber(value, fallbackCountryCode).isValid
  )

export const normalizePhoneNumberToE164 = (
  value: string,
  fallbackCountryCode?: string | null
) => {
  if (!value.trim()) {
    return
  }

  const result = analyzePhoneNumber(value, fallbackCountryCode)

  if (!(result.isValid && result.details?.e164)) {
    return
  }

  return result.details.e164
}

export const toPhoneFormValue = (details: PhoneInputValueChangeDetails) =>
  details.nationalNumber
    ? `+${details.callingCode}${details.nationalNumber}`
    : details.value
