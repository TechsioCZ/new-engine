import type { HttpTypes } from "@medusajs/types"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"

import {
  DEFAULT_CURRENCY_CODE,
  normalizeSupportedCurrencyCode,
} from "./currency"
import type { HerbatikaCurrencyCode } from "./currency"
import type { HerbatikaMarketContext } from "./market-context"

export type HerbatikaRegionInfo = RegionInfo & {
  currency_code?: HerbatikaCurrencyCode
}

const resolveRegionCountryCodes = (region: HttpTypes.StoreRegion): string[] =>
  region.countries
    ?.map((country) => country.iso_2?.toLowerCase())
    .filter(
      (countryCode): countryCode is string => countryCode !== undefined,
    ) ?? []

export const regionMatchesMarket = (
  region: HttpTypes.StoreRegion,
  marketContext: HerbatikaMarketContext,
) => resolveRegionCountryCodes(region).includes(marketContext.countryCode)

const resolveCountryCode = (
  region: HttpTypes.StoreRegion,
  expectedCountryCode?: string,
): string => {
  const countryCodes = resolveRegionCountryCodes(region)
  const normalizedExpectedCountryCode = expectedCountryCode
    ?.trim()
    .toLowerCase()

  if (
    normalizedExpectedCountryCode !== undefined &&
    countryCodes.includes(normalizedExpectedCountryCode)
  ) {
    return normalizedExpectedCountryCode
  }
  return countryCodes[0] ?? ""
}

export const toRegionInfo = (
  region: HttpTypes.StoreRegion,
  expectedCountryCode?: string,
): HerbatikaRegionInfo => {
  const currencyCode = normalizeSupportedCurrencyCode(region.currency_code)

  return {
    country_code: resolveCountryCode(region, expectedCountryCode),
    region_id: region.id,
    ...(currencyCode === null ? {} : { currency_code: currencyCode }),
  }
}

export const resolveRegionCurrency = (
  region?: HerbatikaRegionInfo | null,
): HerbatikaCurrencyCode => {
  const explicitCurrencyCode = normalizeSupportedCurrencyCode(
    region?.currency_code,
  )

  if (explicitCurrencyCode !== null) {
    return explicitCurrencyCode
  }

  return DEFAULT_CURRENCY_CODE
}

export const resolveRegionForMarket = (
  regions: HttpTypes.StoreRegion[],
  marketContext: HerbatikaMarketContext,
  regionId: string | null | undefined,
): HttpTypes.StoreRegion | null => {
  if (regionId !== null && regionId !== undefined && regionId.length > 0) {
    const selectedRegion = regions.find((region) => region.id === regionId)
    if (selectedRegion && regionMatchesMarket(selectedRegion, marketContext)) {
      return selectedRegion
    }
  }

  return (
    regions.find((region) => regionMatchesMarket(region, marketContext)) ?? null
  )
}
