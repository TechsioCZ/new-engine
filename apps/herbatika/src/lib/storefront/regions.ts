"use client"

import { useQuery } from "@tanstack/react-query"
import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { useEffect, useState } from "react"
import { useMarketContext } from "./market-context-provider"
import {
  buildCompleteRegionListQueryKey,
  fetchCompleteRegionList,
} from "./region-pages"
import {
  getStoredRegionPreference,
  persistRegionPreference,
} from "./region-preferences"
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

export const useCompleteRegions = () => {
  const query = useQuery({
    queryKey: buildCompleteRegionListQueryKey(
      storefront.queryKeys.regions.all()
    ),
    queryFn: ({ signal }) =>
      fetchCompleteRegionList((listParams) =>
        storefront.services.regions.getRegions(listParams, signal)
      ),
    ...storefront.cacheConfig.static,
  })

  return { ...query, regions: query.data?.regions ?? [] }
}

type UseRegionBootstrapOptions = {
  initialRegion?: RegionInfo | null
}

export function useRegionBootstrap(options: UseRegionBootstrapOptions = {}) {
  const initialRegion = options.initialRegion ?? null
  const marketContext = useMarketContext()

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    initialRegion?.region_id ?? null
  )

  const { regions, isLoading, isFetching, error } = useCompleteRegions()

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

    persistRegionPreference(toRegionInfo(resolvedRegion, marketContext))
  }, [marketContext, regions, selectedRegionId])

  const selectedRegion = resolveRegionForMarket(
    regions,
    marketContext,
    selectedRegionId
  )
  const region = selectedRegion
    ? toRegionInfo(selectedRegion, marketContext)
    : initialRegion

  const setRegionById = (regionId: string) => {
    const nextRegion = regions.find(
      (candidateRegion) => candidateRegion.id === regionId
    )
    if (!(nextRegion && regionMatchesMarket(nextRegion, marketContext))) {
      return
    }

    setSelectedRegionId(nextRegion.id)
    persistRegionPreference(toRegionInfo(nextRegion, marketContext))
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
