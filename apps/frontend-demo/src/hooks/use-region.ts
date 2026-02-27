"use client"

import type { StoreRegion } from "@medusajs/types"
import { createRegionHooks } from "@techsio/storefront-data/regions/hooks"
import {
  createMedusaRegionService,
  type MedusaRegionDetailInput,
  type MedusaRegionListInput,
} from "@techsio/storefront-data/regions/medusa-service"
import type { RegionQueryKeys } from "@techsio/storefront-data/regions/types"
import { useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { useCallback, useEffect } from "react"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import { regionStore, setSelectedRegionId } from "@/stores/region-store"

const regionQueryKeys: RegionQueryKeys<
  MedusaRegionListInput,
  MedusaRegionDetailInput
> = {
  all: () => queryKeys.regions(),
  list: () => queryKeys.regions(),
  detail: (params) => [...queryKeys.regions(), "detail", params.id] as const,
}

const regionHooks = createRegionHooks({
  service: createMedusaRegionService(sdk),
  queryKeys: regionQueryKeys,
})

export function useRegions() {
  const queryClient = useQueryClient()
  const selectedRegionId = useStore(
    regionStore,
    (state) => state.selectedRegionId
  )

  const {
    regions,
    isLoading,
    error,
  } = regionHooks.useRegions(
    {},
    {
      queryOptions: {
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: 24 * 60 * 60 * 1000,
      },
    }
  )

  // Keep persisted region id valid against fetched regions and fallback to default.
  useEffect(() => {
    if (regions.length === 0) return

    const persistedRegionIsValid = selectedRegionId
      ? regions.some((region) => region.id === selectedRegionId)
      : false

    if (persistedRegionIsValid) return

    const defaultRegion =
      regions.find((region) => region.currency_code === "czk") ||
      regions.find((region) => region.currency_code === "eur") ||
      regions[0]

    if (defaultRegion?.id && defaultRegion.id !== selectedRegionId) {
      setSelectedRegionId(defaultRegion.id)
    }
  }, [regions, selectedRegionId])

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) || null

  const setSelectedRegion = useCallback(
    (region: StoreRegion) => {
      if (region?.id && region.id !== selectedRegionId) {
        setSelectedRegionId(region.id)
        // Invalidate queries that depend on region
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
      }
    },
    [selectedRegionId, queryClient]
  )

  return {
    regions,
    selectedRegion,
    setSelectedRegion,
    isLoading,
    error,
  }
}
