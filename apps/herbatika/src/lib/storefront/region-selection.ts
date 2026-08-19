import type { HttpTypes } from "@medusajs/types"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import {
  DEFAULT_CURRENCY_CODE,
  type HerbatikaCurrencyCode,
  normalizeSupportedCurrencyCode,
} from "./currency"
import {
  HERBATIKA_STOREFRONT_NAMESPACE,
  type HerbatikaMarketContext,
} from "./market-context"

type RegionCurrencySource = RegionInfo & {
  currency_code?: unknown
}

export type HerbatikaRegionInfo = RegionInfo & {
  region_id: string
  country_code: string
  currency_code: HerbatikaCurrencyCode
  salesChannelId: string
}

type RegionMarketMetadata = {
  storefront_market_code?: unknown
  storefront_sales_channel_id?: unknown
  storefront_shop_namespace?: unknown
}

const resolveRegionCountryCodes = (region: HttpTypes.StoreRegion): string[] =>
  region.countries
    ?.map((country) => country.iso_2?.toLowerCase())
    .filter((countryCode): countryCode is string => Boolean(countryCode)) ?? []

const resolveRegionMarketMetadata = (region: HttpTypes.StoreRegion) => {
  const metadata: RegionMarketMetadata = region.metadata ?? {}

  return {
    marketCode:
      typeof metadata.storefront_market_code === "string"
        ? metadata.storefront_market_code.trim().toLowerCase()
        : "",
    salesChannelId:
      typeof metadata.storefront_sales_channel_id === "string"
        ? metadata.storefront_sales_channel_id.trim()
        : "",
    storefrontNamespace:
      typeof metadata.storefront_shop_namespace === "string"
        ? metadata.storefront_shop_namespace.trim().toLowerCase()
        : "",
  }
}

export const regionMatchesMarket = (
  region: HttpTypes.StoreRegion,
  marketContext: HerbatikaMarketContext
) => {
  const metadata = resolveRegionMarketMetadata(region)

  return (
    resolveRegionCountryCodes(region).includes(marketContext.countryCode) &&
    normalizeSupportedCurrencyCode(region.currency_code) ===
      marketContext.currencyCode &&
    metadata.marketCode === marketContext.code &&
    metadata.storefrontNamespace === HERBATIKA_STOREFRONT_NAMESPACE &&
    Boolean(metadata.salesChannelId)
  )
}

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
  marketContext: HerbatikaMarketContext
): HerbatikaRegionInfo => {
  const currencyCode = normalizeSupportedCurrencyCode(region.currency_code)
  const { salesChannelId } = resolveRegionMarketMetadata(region)

  if (!(currencyCode && regionMatchesMarket(region, marketContext))) {
    throw new Error("Storefront region does not match the configured market.")
  }

  return {
    region_id: region.id,
    country_code: resolveCountryCode(region, marketContext.countryCode),
    currency_code: currencyCode,
    salesChannelId,
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

  if (!region) {
    return DEFAULT_CURRENCY_CODE
  }

  throw new Error("Storefront region is missing a valid currency.")
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
