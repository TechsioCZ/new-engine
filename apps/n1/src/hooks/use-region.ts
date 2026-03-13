import type { HttpTypes } from "@medusajs/types"
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants"
import { storefront } from "./storefront-preset"

const REGION_STALE_TIME = 5 * 60 * 1000
const REGION_GC_TIME = 30 * 60 * 1000
const REGION_RETRY_CAP = 10_000
const REGION_RETRY_ATTEMPTS = 5

type Region = HttpTypes.StoreRegion

const DEFAULT_CURRENCY_CODE = "czk"

const regionQueryOptions = {
  staleTime: REGION_STALE_TIME,
  gcTime: REGION_GC_TIME,
  retry: REGION_RETRY_ATTEMPTS,
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, REGION_RETRY_CAP),
  refetchOnMount: true,
  refetchOnWindowFocus: false,
}

const regionHooks = storefront.hooks.regions

function findPreferredRegion(regions: Region[]): Region | undefined {
  return (
    regions.find((r) =>
      r.countries?.some((country) => country.iso_2 === DEFAULT_COUNTRY_CODE)
    ) || regions[0]
  )
}

function getRegionValues(region: Region | undefined) {
  const preferredCountry = region?.countries?.find(
    (country) => country.iso_2 === DEFAULT_COUNTRY_CODE
  )

  return {
    regionId: region?.id,
    countryCode:
      preferredCountry?.iso_2 ??
      region?.countries?.[0]?.iso_2 ??
      DEFAULT_COUNTRY_CODE,
    currencyCode: region?.currency_code || DEFAULT_CURRENCY_CODE,
  }
}

function resolveRegionSelection(regions: Region[]) {
  const selectedRegion = findPreferredRegion(regions)
  const { regionId, countryCode, currencyCode } =
    getRegionValues(selectedRegion)

  return {
    selectedRegion,
    regionId,
    countryCode,
    currencyCode,
  }
}

export function useRegion() {
  const { regions, isLoading } = regionHooks.useRegions(
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
    isLoading,
  }
}

export function useSuspenseRegion() {
  const { regions } = regionHooks.useSuspenseRegions(
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
