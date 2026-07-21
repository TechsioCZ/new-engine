import type { useTranslations } from "next-intl"

export type AddressValidationMessages = {
  addressMinLength: string
  addressRequired: string
  cityMinLength: string
  cityRequired: string
  companyIdMinLength: string
  companyIdRequired: string
  companyNameMinLength: string
  companyNameRequired: string
  countryInvalid: string
  countryRequired: string
  emailInvalid: string
  emailRequired: string
  firstNameMinLength: string
  lastNameMinLength: string
  phoneInvalid: string
  phoneMinDigits: string
  phoneRequired: string
  postalCodeInvalid: string
  postalCodeMinDigits: string
  postalCodeRequired: string
  taxIdMinLength: string
  taxIdRequired: string
}

type FormTranslator = ReturnType<typeof useTranslations<"form">>

export const translateAddressValidationMessages = (
  translate: FormTranslator
): AddressValidationMessages => ({
  addressMinLength: translate("validation.address_min_length"),
  addressRequired: translate("validation.address_required"),
  cityMinLength: translate("validation.city_min_length"),
  cityRequired: translate("validation.city_required"),
  companyIdMinLength: translate("validation.company_id_min_length"),
  companyIdRequired: translate("validation.company_id_required"),
  companyNameMinLength: translate("validation.company_name_min_length"),
  companyNameRequired: translate("validation.company_name_required"),
  countryInvalid: translate("validation.country_invalid"),
  countryRequired: translate("validation.country_required"),
  emailInvalid: translate("validation.email_invalid"),
  emailRequired: translate("validation.email_required"),
  firstNameMinLength: translate("validation.first_name_min_length"),
  lastNameMinLength: translate("validation.last_name_min_length"),
  phoneInvalid: translate("validation.phone_invalid"),
  phoneMinDigits: translate("validation.phone_min_digits"),
  phoneRequired: translate("validation.phone_required"),
  postalCodeInvalid: translate("validation.postal_code_invalid"),
  postalCodeMinDigits: translate("validation.postal_code_min_digits"),
  postalCodeRequired: translate("validation.postal_code_required"),
  taxIdMinLength: translate("validation.tax_id_min_length"),
  taxIdRequired: translate("validation.tax_id_required"),
})
