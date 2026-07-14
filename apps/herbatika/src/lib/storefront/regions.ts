"use client"

import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { useEffect, useState } from "react"
import { useMarketContext } from "./market-context-provider"
import {
  getStoredRegionPreference,
  persistRegionPreference,
} from "./region-preferences"
import { REGION_LIST_FIELDS, REGION_LIST_LIMIT } from "./region-query-config"
import {
  regionMatchesMarket,
  resolveRegionForMarket,
  toRegionInfo,
} from "./region-selection"
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
  const marketContext = useMarketContext()

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    initialRegion?.region_id ?? null
  )

  const { regions, isLoading, isFetching, error } = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })

  useEffect(() => {
    const storedRegion = getStoredRegionPreference()
    const storedRegionId = storedRegion?.region_id ?? null

    if (!storedRegionId) {
      return
    }

    setSelectedRegionId((currentRegionId) => currentRegionId ?? storedRegionId)
  }, [])

  useEffect(() => {
    if (regions.length === 0) {
      return
    }

    const resolvedRegion = resolveRegionForMarket(
      regions,
      marketContext,
      selectedRegionId
    )

    if (!resolvedRegion) {
      return
    }

    if (resolvedRegion.id !== selectedRegionId) {
      setSelectedRegionId(resolvedRegion.id)
    }

    persistRegionPreference(
      toRegionInfo(resolvedRegion, marketContext.countryCode)
    )
  }, [marketContext, regions, selectedRegionId])

  const selectedRegion = resolveRegionForMarket(
    regions,
    marketContext,
    selectedRegionId
  )
  const region = selectedRegion
    ? toRegionInfo(selectedRegion, marketContext.countryCode)
    : initialRegion

  const setRegionById = (regionId: string) => {
    const nextRegion = regions.find(
      (candidateRegion) => candidateRegion.id === regionId
    )
    if (!nextRegion || !regionMatchesMarket(nextRegion, marketContext)) {
      return
    }

    setSelectedRegionId(nextRegion.id)
    persistRegionPreference(toRegionInfo(nextRegion, marketContext.countryCode))
  }

  return {
    region,
    regions,
    selectedRegion,
    selectedRegionId,
    isLoading,
    isFetching,
    error,
    setRegionById,
  }
}
