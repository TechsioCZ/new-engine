"use client"

import { useMemo } from "react"
import { resolveCountryItemsForRegion } from "@/lib/forms/country-options"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

export const useRegisterCountryItems = () => {
  const marketContext = useMarketContext()

  return useMemo(
    () =>
      resolveCountryItemsForRegion({
        activeCountryCode: marketContext.countryCode,
        locale: marketContext.locale,
        regions: [],
      }),
    [marketContext.countryCode, marketContext.locale]
  )
}
