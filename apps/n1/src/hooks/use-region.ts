import type { HttpTypes } from "@medusajs/types"
import { DEFAULT_COUNTRY_CODE, DEFAULT_CURRENCY } from "@/lib/constants"
import { resolveRegionSelection } from "@/lib/region-selection"
import { storefront } from "./storefront-preset"

const REGION_STALE_TIME = 5 * 60 * 1000
const REGION_GC_TIME = 30 * 60 * 1000
const REGION_RETRY_CAP = 10_000
const REGION_RETRY_ATTEMPTS = 5

type Region = HttpTypes.StoreRegion

type RegionSelection = {
  selectedRegion: Region | undefined
  regionId: string | undefined
  countryCode: string
  currencyCode: string
}

type UseRegionReturn = RegionSelection & {
  regions: Region[]
  isLoading: boolean
}

type UseSuspenseRegionReturn = RegionSelection & {
  regions: Region[]
}

const regionQueryOptions = {
  staleTime: REGION_STALE_TIME,
  gcTime: REGION_GC_TIME,
  retry: REGION_RETRY_ATTEMPTS,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, REGION_RETRY_CAP),
  refetchOnMount: true,
  refetchOnWindowFocus: false,
}

export function useRegion(): UseRegionReturn {
  const { regions, isLoading } = storefront.hooks.regions.useRegions(
    {},
    { queryOptions: regionQueryOptions }
  )

  if (regions.length === 0 && isLoading) {
    return {
      regions,
      selectedRegion: undefined,
      regionId: undefined,
      countryCode: DEFAULT_COUNTRY_CODE,
      currencyCode: DEFAULT_CURRENCY,
      isLoading,
    }
  }

  const { selectedRegion, regionId, countryCode, currencyCode } =
    resolveRegionSelection(regions)

  return {
    regions,
    selectedRegion,
    regionId,
    countryCode,
    currencyCode,
    isLoading,
  }
}

export function useSuspenseRegion(): UseSuspenseRegionReturn {
  const { regions } = storefront.hooks.regions.useSuspenseRegions(
    {},
    { queryOptions: regionQueryOptions }
  )

  const { selectedRegion, regionId, countryCode, currencyCode } =
    resolveRegionSelection(regions)

  return {
    regions,
    selectedRegion,
    regionId,
    countryCode,
    currencyCode,
  }
}
