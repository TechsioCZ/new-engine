import type { HttpTypes } from "@medusajs/types"
import { createRegionHooks } from "@techsio/storefront-data/regions/hooks"
import {
  createMedusaRegionService,
  type MedusaRegionDetailInput,
  type MedusaRegionListInput,
} from "@techsio/storefront-data/regions/medusa-service"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

const REGION_STALE_TIME = 5 * 60 * 1000
const REGION_GC_TIME = 30 * 60 * 1000
const REGION_RETRY_CAP = 10_000
const REGION_RETRY_ATTEMPTS = 5

type Region = HttpTypes.StoreRegion
type RegionListInput = { enabled?: boolean }
type RegionDetailInput = { id?: string; enabled?: boolean }

const DEFAULT_COUNTRY_CODE = "cz"
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

function buildListParams(_input: RegionListInput): MedusaRegionListInput {
  return {}
}

function buildDetailParams(input: RegionDetailInput): MedusaRegionDetailInput {
  return { id: input.id }
}

const regionQueryKeys = {
  all: () => [...queryKeys.all, "regions"] as const,
  list: (_params: MedusaRegionListInput) => queryKeys.regions(),
  detail: (params: MedusaRegionDetailInput) =>
    [...queryKeys.regions(), "detail", params.id] as const,
}

const regionHooks = createRegionHooks<
  Region,
  RegionListInput,
  MedusaRegionListInput,
  RegionDetailInput,
  MedusaRegionDetailInput
>({
  service: createMedusaRegionService(sdk),
  buildListParams,
  buildDetailParams,
  queryKeys: regionQueryKeys,
  queryKeyNamespace: "n1",
})

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

export function useRegion() {
  const { regions, isLoading } = regionHooks.useRegions(
    {},
    { queryOptions: regionQueryOptions }
  )

  const selectedRegion = findPreferredRegion(regions)
  const { regionId, countryCode, currencyCode } =
    getRegionValues(selectedRegion)

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

  const selectedRegion = findPreferredRegion(regions)
  const { regionId, countryCode, currencyCode } =
    getRegionValues(selectedRegion)

  return {
    regions,
    selectedRegion,
    regionId,
    countryCode,
    currencyCode,
  }
}
