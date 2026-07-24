import { normalizeCountryCode } from "../country-options"

export const HERBATIKA_ADDRESS_COUNTRY_CODES = [
  "SK",
  "CZ",
  "AT",
  "HU",
] as const

export type HerbatikaAddressCountryCode =
  (typeof HERBATIKA_ADDRESS_COUNTRY_CODES)[number]

type PostalCodeRule = {
  digitCount: number
  example: string
  groupAfterDigit?: number
}

type AddressCountryRule = {
  code: HerbatikaAddressCountryCode
  label: string
  postalCode: PostalCodeRule
}

export const HERBATIKA_ADDRESS_COUNTRY_RULES = {
  AT: {
    code: "AT",
    label: "Rakúsko",
    postalCode: {
      digitCount: 4,
      example: "1010",
    },
  },
  CZ: {
    code: "CZ",
    label: "Česko",
    postalCode: {
      digitCount: 5,
      example: "110 00",
      groupAfterDigit: 3,
    },
  },
  HU: {
    code: "HU",
    label: "Maďarsko",
    postalCode: {
      digitCount: 4,
      example: "1051",
    },
  },
  SK: {
    code: "SK",
    label: "Slovensko",
    postalCode: {
      digitCount: 5,
      example: "811 01",
      groupAfterDigit: 3,
    },
  },
} as const satisfies Record<HerbatikaAddressCountryCode, AddressCountryRule>

const supportedCountryCodeSet = new Set<string>(HERBATIKA_ADDRESS_COUNTRY_CODES)

export const isHerbatikaAddressCountryCode = (
  countryCode: string | null | undefined
): countryCode is HerbatikaAddressCountryCode =>
  Boolean(countryCode && supportedCountryCodeSet.has(countryCode))

export const normalizeHerbatikaAddressCountryCode = (
  countryCode: string | null | undefined
): HerbatikaAddressCountryCode | null => {
  const normalized = normalizeCountryCode(countryCode)
  return isHerbatikaAddressCountryCode(normalized) ? normalized : null
}

export const getHerbatikaAddressCountryRule = (
  countryCode: string | null | undefined
) => {
  const normalized = normalizeHerbatikaAddressCountryCode(countryCode)
  return normalized ? HERBATIKA_ADDRESS_COUNTRY_RULES[normalized] : null
}
