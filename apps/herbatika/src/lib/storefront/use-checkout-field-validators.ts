"use client"

import { useMemo } from "react"
import { createCheckoutFieldValidators } from "@/lib/forms/checkout/address-validators"
import type { FormStorefrontTexts } from "./use-form-storefront-texts"

export function useCheckoutFieldValidators(
  validation: FormStorefrontTexts["validation"]
) {
  return useMemo(
    () => createCheckoutFieldValidators(validation),
    [
      validation.addressMinLength,
      validation.addressRequired,
      validation.cityMinLength,
      validation.cityRequired,
      validation.companyIdMinLength,
      validation.companyIdRequired,
      validation.companyNameMinLength,
      validation.companyNameRequired,
      validation.countryInvalid,
      validation.countryRequired,
      validation.emailInvalid,
      validation.emailRequired,
      validation.firstNameMinLength,
      validation.lastNameMinLength,
      validation.phoneInvalid,
      validation.phoneMinDigits,
      validation.phoneRequired,
      validation.postalCodeInvalid,
      validation.postalCodeMinDigits,
      validation.postalCodeRequired,
      validation.taxIdMinLength,
      validation.taxIdRequired,
    ]
  )
}
