import { PHONE_FORMAT_HINTS, POSTAL_FORMAT_HINTS } from "./types"
import type { SupportedCountryCode } from "./types"

export function getPostalHelpText(countryCode: SupportedCountryCode): string {
  return `Formát: ${POSTAL_FORMAT_HINTS[countryCode]}`
}

export function getPostalErrorText(_countryCode: SupportedCountryCode): string {
  return "Neplatné PSČ"
}

export function getPhoneHelpText(countryCode: SupportedCountryCode): string {
  return `Formát: ${PHONE_FORMAT_HINTS[countryCode]}`
}

export function getPhoneErrorText(_countryCode: SupportedCountryCode): string {
  return "Neplatné telefonní číslo"
}

