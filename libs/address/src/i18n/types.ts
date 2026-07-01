export const SUPPORTED_COUNTRY_CODES = [
  "CZ",
  "SK",
  "DE",
  "AT",
  "PL",
  "GB",
] as const

export type SupportedCountryCode = (typeof SUPPORTED_COUNTRY_CODES)[number]

export const POSTAL_FORMAT_HINTS: Record<SupportedCountryCode, string> = {
  CZ: "XXX XX",
  SK: "XXX XX",
  DE: "XXXXX",
  AT: "XXXX",
  PL: "XX-XXX",
  // UK postcodes have multiple variants; we intentionally show a well-known example.
  GB: "SW1A 1AA",
}

export const PHONE_FORMAT_HINTS: Record<SupportedCountryCode, string> = {
  CZ: "777 888 999",
  SK: "901 234 567",
  DE: "1512 3456789",
  AT: "660 123 4567",
  PL: "512 345 678",
  GB: "7400 123456",
}

