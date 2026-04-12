import type { HttpTypes } from "@medusajs/types"
import { DEFAULT_COUNTRY_CODE, DEFAULT_CURRENCY } from "@/lib/constants"

export type StorefrontRegion = HttpTypes.StoreRegion

export type StorefrontRegionSelection = {
  selectedRegion: StorefrontRegion | undefined
  regionId: string | undefined
  countryCode: string
  currencyCode: string
}

export function selectPreferredRegion(
  regions: StorefrontRegion[]
): StorefrontRegion | undefined {
  return (
    regions.find((region) =>
      region.countries?.some(
        (country) => country.iso_2 === DEFAULT_COUNTRY_CODE
      )
    ) ?? regions[0]
  )
}

export function resolveRegionSelection(
  regions: StorefrontRegion[]
): StorefrontRegionSelection {
  const selectedRegion = selectPreferredRegion(regions)
  const preferredCountry = selectedRegion?.countries?.find(
    (country) => country.iso_2 === DEFAULT_COUNTRY_CODE
  )

  return {
    selectedRegion,
    regionId: selectedRegion?.id,
    countryCode:
      preferredCountry?.iso_2 ??
      selectedRegion?.countries?.[0]?.iso_2 ??
      DEFAULT_COUNTRY_CODE,
    currencyCode: selectedRegion?.currency_code || DEFAULT_CURRENCY,
  }
}
