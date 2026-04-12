import { cache } from "react"
import { storefrontServerRead } from "@/lib/storefront-server-read"
import {
  resolveRegionSelection,
  type StorefrontRegionSelection,
} from "@/lib/region-selection"

async function fetchStorefrontRegionSelection(): Promise<StorefrontRegionSelection> {
  const { regions } = await storefrontServerRead.services.regions.getRegions({
    fields: "id,currency_code,*countries",
  })

  return resolveRegionSelection(regions)
}

export const getStorefrontRegionSelection = cache(fetchStorefrontRegionSelection)
