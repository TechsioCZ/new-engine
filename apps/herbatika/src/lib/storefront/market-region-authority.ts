import type { HttpTypes } from "@medusajs/types"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { getHerbatikaMarketContext } from "./market-context"
import { type HerbatikaRegionInfo, toRegionInfo } from "./region-selection"

export const resolveBoundRegion = (
  binding: MarketRuntimeBinding,
  regions: readonly HttpTypes.StoreRegion[]
): HerbatikaRegionInfo => {
  const region = regions.find((candidate) => candidate.id === binding.regionId)
  if (!region) {
    throw new Error(
      `Configured region is unavailable for market ${binding.market}`
    )
  }

  const expectedCountryCode = binding.countryCode.toLowerCase()
  const regionInfo = toRegionInfo(region, expectedCountryCode)
  if (regionInfo.country_code !== expectedCountryCode) {
    throw new Error(
      `Configured region does not contain the country for market ${binding.market}`
    )
  }

  const expectedCurrencyCode = getHerbatikaMarketContext(
    binding.market
  ).currencyCode
  if (regionInfo.currency_code !== expectedCurrencyCode) {
    throw new Error(
      `Configured region currency does not match market ${binding.market}: expected ${expectedCurrencyCode}`
    )
  }

  return regionInfo
}
