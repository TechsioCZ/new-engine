"use client"

import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { createCheckoutFieldValidators } from "@/lib/forms/checkout/address-validators"

export function useCheckoutFieldValidators() {
  const tForm = useTranslations("form")

  return useMemo(
    () =>
      createCheckoutFieldValidators({
        addressMinLength: tForm("validation.address_min_length"),
        addressRequired: tForm("validation.address_required"),
        cityMinLength: tForm("validation.city_min_length"),
        cityRequired: tForm("validation.city_required"),
        companyIdMinLength: tForm("validation.company_id_min_length"),
        companyIdRequired: tForm("validation.company_id_required"),
        companyNameMinLength: tForm("validation.company_name_min_length"),
        companyNameRequired: tForm("validation.company_name_required"),
        countryInvalid: tForm("validation.country_invalid"),
        countryRequired: tForm("validation.country_required"),
        emailInvalid: tForm("validation.email_invalid"),
        emailRequired: tForm("validation.email_required"),
        firstNameMinLength: tForm("validation.first_name_min_length"),
        lastNameMinLength: tForm("validation.last_name_min_length"),
        phoneInvalid: tForm("validation.phone_invalid"),
        phoneMinDigits: tForm("validation.phone_min_digits"),
        phoneRequired: tForm("validation.phone_required"),
        postalCodeInvalid: tForm("validation.postal_code_invalid"),
        postalCodeMinDigits: tForm("validation.postal_code_min_digits"),
        postalCodeRequired: tForm("validation.postal_code_required"),
        taxIdMinLength: tForm("validation.tax_id_min_length"),
        taxIdRequired: tForm("validation.tax_id_required"),
      }),
    [tForm]
  )
}
