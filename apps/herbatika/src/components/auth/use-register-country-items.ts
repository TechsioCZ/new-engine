"use client"

import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { useMemo } from "react"
import { resolveCountryItemsForRegion } from "@/lib/forms/country-options"
import {
  REGION_LIST_FIELDS,
  REGION_LIST_LIMIT,
} from "@/lib/storefront/region-query-config"
import { useRegions } from "@/lib/storefront/regions"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

export const useRegisterCountryItems = (region?: RegionInfo | null) => {
  const marketContext = useMarketContext()
  const regionsQuery = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })

  return useMemo(
    () =>
      resolveCountryItemsForRegion({
        activeCountryCode: region?.country_code,
        locale: marketContext.locale,
        regionId: region?.region_id,
        regions: regionsQuery.regions,
      }),
    [
      marketContext.locale,
      region?.country_code,
      region?.region_id,
      regionsQuery.regions,
    ]
  )
}
