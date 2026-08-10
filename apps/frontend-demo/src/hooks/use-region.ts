"use client"

import type { StoreRegion } from "@medusajs/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useSelector } from "@tanstack/react-store"
import { useEffect } from "react"

import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import { regionStore, setSelectedRegionId } from "@/stores/region-store"

export const useRegions = () => {
  const queryClient = useQueryClient()
  const selectedRegionId = useSelector(
    regionStore,
    (state) => state.selectedRegionId,
  )

  const {
    data: regions = [],
    isLoading,
    error,
  } = useQuery({
    // Retain region data for 24 hours.
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const response = await sdk.store.region.list()
      return response.regions
    },
    queryKey: queryKeys.regions(),
    // Regions change rarely, so cached data remains fresh.
    staleTime: Number.POSITIVE_INFINITY,
  })

  // Initialize selected region from regions list or default to USD
  useEffect(() => {
    if (regions.length === 0 || selectedRegionId !== null) {
      return
    }

    // Default to USD region if no stored preference
    const defaultRegion =
      regions.find((region) => region.currency_code === "czk") ??
      regions.find((region) => region.currency_code === "eur") ??
      regions.at(0)

    if (defaultRegion !== undefined) {
      setSelectedRegionId(defaultRegion.id)
    }
  }, [regions, selectedRegionId])

  const selectedRegion =
    regions.find((region) => region.id === selectedRegionId) ?? null

  const setSelectedRegion = async (region: StoreRegion) => {
    if (region.id.length > 0 && region.id !== selectedRegionId) {
      setSelectedRegionId(region.id)
      // Invalidate queries that depend on region
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.products.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.cart() }),
      ])
    }
  }

  const errorMessage = error?.message ?? null

  return {
    error: errorMessage,
    isLoading,
    regions,
    selectedRegion,
    setSelectedRegion,
  }
}
