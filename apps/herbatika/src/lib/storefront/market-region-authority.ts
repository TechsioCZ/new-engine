import type { HttpTypes } from "@medusajs/types"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import { toRegionInfo } from "./region-selection"

export const resolveBoundRegion = (
  binding: MarketRuntimeBinding,
  regions: readonly HttpTypes.StoreRegion[]
): RegionInfo => {
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
  return regionInfo
}
