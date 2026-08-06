import {
  AsYouType,
  formatIncompletePhoneNumber,
  getCountryCallingCode,
  isSupportedCountry,
  parseIncompletePhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js/max"
import type { CountryCode, E164Number } from "libphonenumber-js/max"
import type { ReactNode } from "react"

export interface PhoneInputCountry {
  value: CountryCode
  label: ReactNode
  disabled?: boolean | undefined
  displayValue?: string | undefined
  name?: string | undefined
  flag?: ReactNode | undefined
  callingCode?: string | undefined
  [key: string]: unknown
}

export interface PhoneInputValueChangeDetails {
  value: string
  e164: E164Number
  country: CountryCode
  callingCode: string
  nationalNumber: string
  isPossible: boolean
  isValid: boolean
}

interface PhoneInputValueDetailsOptions {
  countries?: PhoneInputCountry[] | undefined
  syncCountryFromValue?: boolean | undefined
}

export const defaultPhoneInputCountries: PhoneInputCountry[] = [
  { label: "Slovakia", name: "Slovakia", value: "SK" },
  { label: "Czechia", name: "Czechia", value: "CZ" },
  { label: "Hungary", name: "Hungary", value: "HU" },
  { label: "Romania", name: "Romania", value: "RO" },
  { label: "Poland", name: "Poland", value: "PL" },
  { label: "Austria", name: "Austria", value: "AT" },
  { label: "Germany", name: "Germany", value: "DE" },
]

export const getPhoneCountryCallingCode = (
  country: CountryCode | PhoneInputCountry,
): string => {
  const countryCode = typeof country === "string" ? country : country.value
  const callingCode = getCountryCallingCode(countryCode)

  if (typeof country !== "string" && country.callingCode === callingCode) {
    return country.callingCode
  }

  return callingCode
}

const stripCountryCallingCode = (
  value: string,
  callingCode: string,
): string => {
  const prefix = `+${callingCode}`

  return value.startsWith(prefix)
    ? value.slice(prefix.length).trimStart()
    : value
}

const formatNationalSignificantPhoneValue = (
  value: string,
  country: CountryCode,
): string => {
  const callingCode = getPhoneCountryCallingCode(country)
  const incompleteValue = parseIncompletePhoneNumber(value)

  if (incompleteValue.startsWith("+")) {
    if (incompleteValue.startsWith(`+${callingCode}`)) {
      return stripCountryCallingCode(
        formatIncompletePhoneNumber(incompleteValue, country),
        callingCode,
      )
    }

    return formatIncompletePhoneNumber(value, country)
  }

  return stripCountryCallingCode(
    formatIncompletePhoneNumber(`+${callingCode}${incompleteValue}`, country),
    callingCode,
  )
}

export const formatPhoneInputValue = (
  value: string,
  country: CountryCode,
): string => {
  if (value.trim() === "") {
    return ""
  }

  const parsedNumber = parsePhoneNumberFromString(value, country)
  if (parsedNumber?.country === country) {
    return formatNationalSignificantPhoneValue(
      parsedNumber.nationalNumber,
      country,
    )
  }

  if (parsedNumber?.country !== undefined) {
    return formatIncompletePhoneNumber(value, country)
  }

  return formatNationalSignificantPhoneValue(value, country)
}

export const isCountryAvailable = (
  countries: PhoneInputCountry[] | undefined,
  country: CountryCode,
): boolean => {
  if (!isSupportedCountry(country)) {
    return false
  }

  return (
    countries === undefined ||
    countries.some((item) => item.value === country && item.disabled !== true)
  )
}

const resolveDetailsCountry = (
  value: string,
  country: CountryCode,
  options: PhoneInputValueDetailsOptions,
): CountryCode => {
  if (options.syncCountryFromValue !== true) {
    return country
  }

  const valueCountry = parsePhoneNumberFromString(value, country)?.country
  if (
    valueCountry === undefined ||
    !isCountryAvailable(options.countries, valueCountry)
  ) {
    return country
  }

  return valueCountry
}

interface PhoneNumberCheckOptions {
  hasCountryMismatch: boolean
  formattedResult: boolean
  parsedResult?: boolean | undefined
}

const getPhoneNumberCheckResult = ({
  hasCountryMismatch,
  formattedResult,
  parsedResult,
}: PhoneNumberCheckOptions): boolean =>
  !hasCountryMismatch && (parsedResult ?? formattedResult)

export const getPhoneInputValueDetailsInternal = (
  value: string,
  country: CountryCode,
  options: PhoneInputValueDetailsOptions = {},
): PhoneInputValueChangeDetails => {
  const detailsCountry = resolveDetailsCountry(value, country, options)
  const formattedValue = formatPhoneInputValue(value, detailsCountry)
  const formatter = new AsYouType(detailsCountry)

  formatter.input(value)

  const parsedNumber =
    parsePhoneNumberFromString(value, detailsCountry) ??
    parsePhoneNumberFromString(formattedValue, detailsCountry)
  const hasCountryMismatch =
    parsedNumber?.country !== undefined &&
    parsedNumber.country !== detailsCountry
  const detailsNumber = hasCountryMismatch ? undefined : parsedNumber
  const formatterNumber = formatter.getNumber()
  const isPossible = getPhoneNumberCheckResult({
    formattedResult: formatter.isPossible(),
    hasCountryMismatch,
    parsedResult: detailsNumber?.isPossible(),
  })
  const isValid = getPhoneNumberCheckResult({
    formattedResult: formatter.isValid(),
    hasCountryMismatch,
    parsedResult: detailsNumber?.isValid(),
  })
  const e164 = isValid
    ? (detailsNumber?.number ?? formatter.getNumberValue() ?? "")
    : ""
  const nationalNumber = hasCountryMismatch
    ? ""
    : (detailsNumber?.nationalNumber.toString() ??
      formatterNumber?.nationalNumber ??
      "")

  return {
    callingCode: getPhoneCountryCallingCode(detailsCountry),
    country: detailsCountry,
    e164,
    isPossible,
    isValid,
    nationalNumber,
    value: formattedValue,
  }
}

export const getPhoneInputValueDetails = (
  value: string,
  country: CountryCode,
): PhoneInputValueChangeDetails =>
  getPhoneInputValueDetailsInternal(value, country)
