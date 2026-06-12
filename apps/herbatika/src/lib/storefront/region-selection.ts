import type { HttpTypes } from "@medusajs/types"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import {
  DEFAULT_CURRENCY_CODE,
  type HerbatikaCurrencyCode,
  normalizeSupportedCurrencyCode,
} from "./currency"

const DEFAULT_COUNTRY_CODE = "sk"
const PREFERRED_COUNTRY_CODES = ["sk", "at", "cz"] as const
const PREFERRED_CURRENCIES = ["eur", "czk"] as const

const COUNTRY_CURRENCY_BY_CODE: Record<string, HerbatikaCurrencyCode> = {
  at: "EUR",
  cz: "CZK",
  sk: "EUR",
}

type RegionCurrencySource = RegionInfo & {
  currency_code?: unknown
}

export type HerbatikaRegionInfo = RegionInfo & {
  currency_code?: HerbatikaCurrencyCode
}

const resolveRegionCountryCodes = (region: HttpTypes.StoreRegion): string[] =>
  region.countries
    ?.map((country) => country.iso_2?.toLowerCase())
    .filter((countryCode): countryCode is string => Boolean(countryCode)) ?? []

export const resolveCountryCode = (region: HttpTypes.StoreRegion): string => {
  const countryCodes = resolveRegionCountryCodes(region)

  for (const preferredCountryCode of PREFERRED_COUNTRY_CODES) {
    if (countryCodes.includes(preferredCountryCode)) {
      return preferredCountryCode
    }
  }

  return countryCodes[0] ?? DEFAULT_COUNTRY_CODE
}

export const toRegionInfo = (
  region: HttpTypes.StoreRegion
): HerbatikaRegionInfo => {
  const currencyCode = normalizeSupportedCurrencyCode(region.currency_code)

  return {
    region_id: region.id,
    country_code: resolveCountryCode(region),
    ...(currencyCode ? { currency_code: currencyCode } : {}),
  }
}

export const resolveRegionCurrency = (
  region?: RegionInfo | null
): HerbatikaCurrencyCode => {
  const explicitCurrencyCode = normalizeSupportedCurrencyCode(
    (region as RegionCurrencySource | null | undefined)?.currency_code
  )

  if (explicitCurrencyCode) {
    return explicitCurrencyCode
  }

  const countryCode = region?.country_code?.trim().toLowerCase()
  return countryCode
    ? (COUNTRY_CURRENCY_BY_CODE[countryCode] ?? DEFAULT_CURRENCY_CODE)
    : DEFAULT_CURRENCY_CODE
}

export const pickDefaultRegion = (
  regions: HttpTypes.StoreRegion[]
): HttpTypes.StoreRegion | null => {
  if (regions.length === 0) {
    return null
  }

  for (const preferredCountryCode of PREFERRED_COUNTRY_CODES) {
    const byCountry = regions.find((region) => {
      const regionCountryCodes = resolveRegionCountryCodes(region)

      return regionCountryCodes.includes(preferredCountryCode)
    })

    if (byCountry) {
      return byCountry
    }
  }

  const byCurrency = regions.find((region) => {
    const currency = region.currency_code?.toLowerCase()
    return Boolean(
      currency && PREFERRED_CURRENCIES.includes(currency as "eur" | "czk")
    )
  })

  return byCurrency ?? regions[0] ?? null
}

export const resolveRegionByIdOrDefault = (
  regions: HttpTypes.StoreRegion[],
  regionId: string | null | undefined
): HttpTypes.StoreRegion | null => {
  if (regionId) {
    const selectedRegion = regions.find((region) => region.id === regionId)
    if (selectedRegion) {
      return selectedRegion
    }
  }

  return pickDefaultRegion(regions)
}
