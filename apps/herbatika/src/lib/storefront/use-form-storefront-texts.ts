"use client"

import { useRequiredStorefrontText } from "./storefront-text-provider"
import { STOREFRONT_TEXT_KEYS } from "./storefront-texts"

export function useFormStorefrontTexts() {
  return {
    address: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formAddress),
    city: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formCity),
    companyId: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formCompanyId),
    companyName: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.formCompanyName
    ),
    country: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formCountry),
    countryPlaceholder: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.formCountryPlaceholder
    ),
    customerNote: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.formCustomerNote
    ),
    email: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formEmail),
    firstName: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formFirstName),
    lastName: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formLastName),
    phone: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formPhone),
    postalCode: useRequiredStorefrontText(
      STOREFRONT_TEXT_KEYS.formPostalCode
    ),
    taxId: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formTaxId),
    validation: {
      addressMinLength: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationAddressMinLength
      ),
      addressRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationAddressRequired
      ),
      cityMinLength: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCityMinLength
      ),
      cityRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCityRequired
      ),
      companyIdMinLength: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCompanyIdMinLength
      ),
      companyIdRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCompanyIdRequired
      ),
      companyNameMinLength: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCompanyNameMinLength
      ),
      companyNameRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCompanyNameRequired
      ),
      countryInvalid: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCountryInvalid
      ),
      countryRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationCountryRequired
      ),
      emailInvalid: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationEmailInvalid
      ),
      emailRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationEmailRequired
      ),
      firstNameMinLength: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationFirstNameMinLength
      ),
      lastNameMinLength: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationLastNameMinLength
      ),
      phoneInvalid: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationPhoneInvalid
      ),
      phoneMinDigits: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationPhoneMinDigits
      ),
      phoneRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationPhoneRequired
      ),
      postalCodeInvalid: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationPostalCodeInvalid
      ),
      postalCodeMinDigits: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationPostalCodeMinDigits
      ),
      postalCodeRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationPostalCodeRequired
      ),
      taxIdMinLength: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationTaxIdMinLength
      ),
      taxIdRequired: useRequiredStorefrontText(
        STOREFRONT_TEXT_KEYS.formValidationTaxIdRequired
      ),
    },
    vatId: useRequiredStorefrontText(STOREFRONT_TEXT_KEYS.formVatId),
  }
}

export type FormStorefrontTexts = ReturnType<typeof useFormStorefrontTexts>
