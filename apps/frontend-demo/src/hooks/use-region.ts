"use client"

import type { StoreRegion } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { useCallback, useEffect } from "react"
import { queryKeys } from "@/lib/query-keys"
import { storefront } from "@/lib/storefront"
import { regionStore, setSelectedRegionId } from "@/stores/region-store"

export function useRegions() {
  const queryClient = useQueryClient()
  const selectedRegionId = useStore(
    regionStore,
    (state) => state.selectedRegionId
  )

  const { regions, isLoading, error } = storefront.hooks.regions.useRegions({})

  useEffect(() => {
    if (regions.length === 0 || selectedRegionId) {
      return
    }

    const defaultRegion =
      regions.find((region) => region.currency_code === "czk") ||
      regions.find((region) => region.currency_code === "eur") ||
      regions[0]

    if (defaultRegion) {
      setSelectedRegionId(defaultRegion.id)
    }
  }, [regions, selectedRegionId])

  const selectedRegion =
    regions.find((region) => region.id === selectedRegionId) || null

  const setSelectedRegion = useCallback(
    (region: StoreRegion) => {
      if (!region?.id || region.id === selectedRegionId) {
        return
      }

      setSelectedRegionId(region.id)
      queryClient.invalidateQueries({
        queryKey: storefront.queryKeys.products.all(),
      })
      queryClient.invalidateQueries({
        queryKey: storefront.queryKeys.cart.all(),
      })
      // Keep legacy queries coherent until cart/search/categories are migrated.
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all() })
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() })
    },
    [queryClient, selectedRegionId]
  )

  return {
    regions,
    selectedRegion,
    setSelectedRegion,
    isLoading,
    error,
  }
}
