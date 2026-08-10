"use client"

import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { createCheckoutFieldValidators } from "@/lib/forms/checkout/address-validators"
import { translateAddressValidationMessages } from "@/lib/forms/validators/address-validation-messages"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

export function useCheckoutFieldValidators() {
  const tForm = useTranslations("form")
  const { countryCode } = useMarketContext()

  return useMemo(
    () =>
      createCheckoutFieldValidators(
        translateAddressValidationMessages(tForm),
        countryCode
      ),
    [countryCode, tForm]
  )
}
