"use client"

import type { RegionInfo } from "@techsio/storefront-data/shared/region"
import { resolveCountryItemsForRegion } from "@/lib/forms/country-options"
import {
  REGION_LIST_FIELDS,
  REGION_LIST_LIMIT,
} from "@/lib/storefront/region-query-config"
import { useRegions } from "@/lib/storefront/regions"

export const useRegisterCountryItems = (region?: RegionInfo | null) => {
  const regionsQuery = useRegions({
    fields: REGION_LIST_FIELDS,
    limit: REGION_LIST_LIMIT,
  })

  return resolveCountryItemsForRegion({
    activeCountryCode: region?.country_code,
    regionId: region?.region_id,
    regions: regionsQuery.regions,
  })
}
