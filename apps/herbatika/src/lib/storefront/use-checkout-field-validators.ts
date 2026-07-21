"use client"

import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { createCheckoutFieldValidators } from "@/lib/forms/checkout/address-validators"
import { translateAddressValidationMessages } from "@/lib/forms/validators/address-validation-messages"

export function useCheckoutFieldValidators() {
  const tForm = useTranslations("form")

  return useMemo(
    () =>
      createCheckoutFieldValidators(
        translateAddressValidationMessages(tForm)
      ),
    [tForm]
  )
}
