"use client"

import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "./region-query-config"
import { storefront } from "./storefront"

const regionHooks = storefront.hooks.regions

export const {
  useRegions,
  useSuspenseRegions,
  useRegion,
  useSuspenseRegion,
  usePrefetchRegions,
  usePrefetchRegion,
} = regionHooks

type UseRegionBootstrapOptions = {
  initialRegion?: RegionInfo | null
}

export function useRegionBootstrap(options: UseRegionBootstrapOptions = {}) {
  const initialRegion = options.initialRegion ?? null
  const selectedRegionId = initialRegion?.region_id ?? null

  const { regions, isLoading, isFetching, error } = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })

  const selectedRegion = selectedRegionId
    ? (regions.find((candidate) => candidate.id === selectedRegionId) ?? null)
    : null

  const setRegionById = (_regionId: string) => {
    // Region authority is fixed by the server-selected market binding.
  }

  return {
    region: initialRegion,
    regions,
    selectedRegion,
    selectedRegionId,
    isLoading,
    isFetching,
    error,
    setRegionById,
  }
}
