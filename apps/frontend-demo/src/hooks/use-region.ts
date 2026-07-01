"use client"

import type { StoreRegion } from "@medusajs/types"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { useEffect } from "react"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import { regionStore, setSelectedRegionId } from "@/stores/region-store"

export function useRegions() {
  const queryClient = useQueryClient()
  const selectedRegionId = useStore(
    regionStore,
    (state) => state.selectedRegionId
  )

  const {
    data: regions = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.regions(),
    queryFn: async () => {
      const response = await sdk.store.region.list()
      return response.regions
    },
    staleTime: Number.POSITIVE_INFINITY, // Regions rarely change
    gcTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  })

  // Initialize selected region from regions list or default to USD
  useEffect(() => {
    if (regions.length === 0 || selectedRegionId) {
      return
    }

    // Default to USD region if no stored preference
    const defaultRegion =
      regions.find((r) => r.currency_code === "czk") ||
      regions.find((r) => r.currency_code === "eur") ||
      regions[0]

    if (defaultRegion) {
      setSelectedRegionId(defaultRegion.id)
    }
  }, [regions, selectedRegionId])

  const selectedRegion = regions.find((r) => r.id === selectedRegionId) || null

  const setSelectedRegion = (region: StoreRegion) => {
    if (region?.id && region.id !== selectedRegionId) {
      setSelectedRegionId(region.id)
      // Invalidate queries that depend on region
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
    }
  }

  let errorMessage: string | null = null
  if (error instanceof Error) {
    errorMessage = error.message
  } else if (error) {
    errorMessage = String(error)
  }

  return {
    regions,
    selectedRegion,
    setSelectedRegion,
    isLoading,
    error: errorMessage,
  }
}
