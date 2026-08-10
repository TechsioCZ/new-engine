"use client"

import { useTranslations } from "next-intl"

import { createCheckoutFieldValidators } from "@/lib/forms/checkout/address-validators"
import { translateAddressValidationMessages } from "@/lib/forms/validators/address-validation-messages"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

export const useCheckoutFieldValidators = () => {
  const tForm = useTranslations("form")
  const { countryCode } = useMarketContext()

  return createCheckoutFieldValidators(
    translateAddressValidationMessages(tForm),
    countryCode,
  )
}
