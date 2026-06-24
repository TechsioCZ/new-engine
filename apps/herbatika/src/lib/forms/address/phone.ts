import {
  getPhoneInputValueDetails,
  type PhoneInputValueChangeDetails,
} from "@techsio/ui-kit/molecules/phone-input"
import {
  HERBATIKA_ADDRESS_COUNTRY_CODES,
  normalizeHerbatikaAddressCountryCode,
  type HerbatikaAddressCountryCode,
} from "./address-country-rules"

export type PhoneNumberValidationIssue =
  | "invalid_country"
  | "invalid_number"
  | "required"

export type PhoneNumberValidationResult =
  | {
      country: HerbatikaAddressCountryCode
      details: PhoneInputValueChangeDetails
      e164: string
      issue?: never
      message?: never
      valid: true
    }
  | {
      country?: HerbatikaAddressCountryCode
      details?: PhoneInputValueChangeDetails
      e164?: never
      issue: PhoneNumberValidationIssue
      message: string
      valid: false
    }

export const validateOptionalPhoneNumberForCountry = (
  value: string,
  countryCode: string | null | undefined
): PhoneNumberValidationResult | undefined => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return
  }

  const normalizedCountryCode = normalizeHerbatikaAddressCountryCode(countryCode)
  if (!normalizedCountryCode) {
    return {
      issue: "invalid_country",
      message: "Vyberte predvoľbu telefónu.",
      valid: false,
    }
  }

  const details = getPhoneInputValueDetails(trimmedValue, normalizedCountryCode)

  if (!(details.isValid && details.e164)) {
    return {
      country: normalizedCountryCode,
      details,
      issue: "invalid_number",
      message: "Zadajte platné telefónne číslo.",
      valid: false,
    }
  }

  return {
    country: normalizedCountryCode,
    details,
    e164: details.e164.toString(),
    valid: true,
  }
}

export const validateRequiredPhoneNumberForCountry = (
  value: string,
  countryCode: string | null | undefined
): PhoneNumberValidationResult => {
  if (!value.trim()) {
    return {
      issue: "required",
      message: "Zadajte telefón.",
      valid: false,
    }
  }

  return (
    validateOptionalPhoneNumberForCountry(value, countryCode) ?? {
      issue: "required",
      message: "Zadajte telefón.",
      valid: false,
    }
  )
}

export const validateOptionalPhoneNumberForSupportedCountries = (
  value: string,
  preferredCountryCode?: string | null
): PhoneNumberValidationResult | undefined => {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return
  }

  const preferredCountry =
    normalizeHerbatikaAddressCountryCode(preferredCountryCode)
  const countryCodes = preferredCountry
    ? [
        preferredCountry,
        ...HERBATIKA_ADDRESS_COUNTRY_CODES.filter(
          (countryCode) => countryCode !== preferredCountry
        ),
      ]
    : HERBATIKA_ADDRESS_COUNTRY_CODES

  let fallbackResult: PhoneNumberValidationResult | undefined

  for (const countryCode of countryCodes) {
    const result = validateOptionalPhoneNumberForCountry(
      trimmedValue,
      countryCode
    )

    if (result?.valid) {
      return result
    }

    fallbackResult ??= result
  }

  return (
    fallbackResult ?? {
      issue: "invalid_country",
      message: "Vyberte predvoÄ¾bu telefÃ³nu.",
      valid: false,
    }
  )
}

export const validateRequiredPhoneNumberForSupportedCountries = (
  value: string,
  preferredCountryCode?: string | null
): PhoneNumberValidationResult => {
  if (!value.trim()) {
    return {
      issue: "required",
      message: "Zadajte telefÃ³n.",
      valid: false,
    }
  }

  return (
    validateOptionalPhoneNumberForSupportedCountries(
      value,
      preferredCountryCode
    ) ?? {
      issue: "required",
      message: "Zadajte telefÃ³n.",
      valid: false,
    }
  )
}

export const normalizePhoneNumberToE164 = (
  value: string,
  countryCode: string | null | undefined
) => {
  const result = validateOptionalPhoneNumberForCountry(value, countryCode)
  return result?.valid ? result.e164 : null
}

export const normalizePhoneNumberToSupportedE164 = (
  value: string,
  preferredCountryCode?: string | null
) => {
  const result = validateOptionalPhoneNumberForSupportedCountries(
    value,
    preferredCountryCode
  )
  return result?.valid ? result.e164 : null
}
