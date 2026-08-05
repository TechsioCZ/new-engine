import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

const REGION_STALE_TIME = 5 * 60 * 1000
const REGION_GC_TIME = 30 * 60 * 1000
const REGION_RETRY_CAP = 10_000
const REGION_RETRY_ATTEMPTS = 5

const getRegionQueryOptions = () =>
  queryOptions({
    gcTime: REGION_GC_TIME,
    queryFn: async () => {
      const response = await sdk.store.region.list()
      return response.regions
    },
    queryKey: queryKeys.regions(),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: REGION_RETRY_ATTEMPTS,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, REGION_RETRY_CAP),
    staleTime: REGION_STALE_TIME,
  })

export function useRegion() {
  const { data: regions = [], isLoading } = useQuery(getRegionQueryOptions())

  const selectedRegion =
    regions.find((r) => r.countries?.some((c) => c.iso_2 === "cz")) ||
    regions[0]

  return {
    countryCode: selectedRegion?.countries?.[0]?.iso_2 || "cz",
    currencyCode: selectedRegion?.currency_code || "czk",
    isLoading,
    regionId: selectedRegion?.id,
    regions,
    selectedRegion,
  }
}

export function useSuspenseRegion() {
  const { data: regions } = useSuspenseQuery(getRegionQueryOptions())

  const selectedRegion =
    regions.find((r) => r.countries?.some((c) => c.iso_2 === "cz")) ||
    regions[0]

  return {
    countryCode: selectedRegion?.countries?.[0]?.iso_2 || "cz",
    currencyCode: selectedRegion?.currency_code || "czk",
    regionId: selectedRegion?.id,
    regions,
    selectedRegion,
  }
}
