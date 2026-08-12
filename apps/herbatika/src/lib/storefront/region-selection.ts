import type { HttpTypes } from "@medusajs/types"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import {
  DEFAULT_CURRENCY_CODE,
  type HerbatikaCurrencyCode,
  normalizeSupportedCurrencyCode,
} from "./currency"
import type { HerbatikaMarketContext } from "./market-context"

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

export const regionMatchesMarket = (
  region: HttpTypes.StoreRegion,
  marketContext: HerbatikaMarketContext
) => resolveRegionCountryCodes(region).includes(marketContext.countryCode)

export const resolveCountryCode = (
  region: HttpTypes.StoreRegion,
  expectedCountryCode?: string
): string => {
  const countryCodes = resolveRegionCountryCodes(region)
  const normalizedExpectedCountryCode = expectedCountryCode
    ?.trim()
    .toLowerCase()

  return normalizedExpectedCountryCode &&
    countryCodes.includes(normalizedExpectedCountryCode)
    ? normalizedExpectedCountryCode
    : (countryCodes[0] ?? "")
}

export const toRegionInfo = (
  region: HttpTypes.StoreRegion,
  expectedCountryCode?: string
): HerbatikaRegionInfo => {
  const currencyCode = normalizeSupportedCurrencyCode(region.currency_code)

  return {
    region_id: region.id,
    country_code: resolveCountryCode(region, expectedCountryCode),
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

  return DEFAULT_CURRENCY_CODE
}

export const resolveRegionForMarket = (
  regions: HttpTypes.StoreRegion[],
  marketContext: HerbatikaMarketContext,
  regionId: string | null | undefined
): HttpTypes.StoreRegion | null => {
  if (regionId) {
    const selectedRegion = regions.find((region) => region.id === regionId)
    if (selectedRegion && regionMatchesMarket(selectedRegion, marketContext)) {
      return selectedRegion
    }
  }

  return (
    regions.find((region) => regionMatchesMarket(region, marketContext)) ?? null
  )
}
