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

export const { useRegions } = regionHooks

interface UseRegionBootstrapOptions {
  initialRegion?: RegionInfo | null
}

export const useRegionBootstrap = (options: UseRegionBootstrapOptions = {}) => {
  const initialRegion = options.initialRegion ?? null
  const marketContext = useMarketContext()

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    () =>
      initialRegion?.region_id ??
      getStoredRegionPreference()?.region_id ??
      null,
  )

  const { regions, isLoading, isFetching, error } = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })

  useEffect(() => {
    if (regions.length === 0) {
      return
    }

    const resolvedRegion = resolveRegionForMarket(
      regions,
      marketContext,
      selectedRegionId,
    )

    if (!resolvedRegion) {
      return
    }

    persistRegionPreference(
      toRegionInfo(resolvedRegion, marketContext.countryCode),
    )
  }, [marketContext, regions, selectedRegionId])

  const selectedRegion = resolveRegionForMarket(
    regions,
    marketContext,
    selectedRegionId,
  )
  const region = selectedRegion
    ? toRegionInfo(selectedRegion, marketContext.countryCode)
    : initialRegion

  const setRegionById = (regionId: string) => {
    const nextRegion = regions.find(
      (candidateRegion) => candidateRegion.id === regionId,
    )
    if (!(nextRegion && regionMatchesMarket(nextRegion, marketContext))) {
      return
    }

    setSelectedRegionId(nextRegion.id)
    persistRegionPreference(toRegionInfo(nextRegion, marketContext.countryCode))
  }

  return {
    error,
    isFetching,
    isLoading,
    region,
    regions,
    selectedRegion,
    selectedRegionId: selectedRegion?.id ?? selectedRegionId,
    setRegionById,
  }
}
