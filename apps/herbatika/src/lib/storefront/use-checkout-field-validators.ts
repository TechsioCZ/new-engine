"use client"

import { useTranslations } from "next-intl"

import { createCheckoutFieldValidators } from "@/lib/forms/checkout/address-validators"
import { translateAddressValidationMessages } from "@/lib/forms/validators/address-validation-messages"

export const useCheckoutFieldValidators = () => {
  const tForm = useTranslations("form")

  return createCheckoutFieldValidators(
    translateAddressValidationMessages(tForm),
  )
}
