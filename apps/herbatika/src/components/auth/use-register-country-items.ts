"use client"

import { resolveCountryItemsForRegion } from "@/lib/forms/country-options"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

export const useRegisterCountryItems = () => {
  const marketContext = useMarketContext()

  return resolveCountryItemsForRegion({
    activeCountryCode: marketContext.countryCode,
    locale: marketContext.locale,
    regions: [],
  })
}
