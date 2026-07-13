import { DEFAULT_ADDRESS_VALIDATION_MESSAGES } from "@/lib/forms/validators/address-validation-messages"

export const FORM_STOREFRONT_TEXT_KEYS = {
  formAddress: "form.address",
  formCity: "form.city",
  formCompanyId: "form.company_id",
  formCompanyName: "form.company_name",
  formCountry: "form.country",
  formCountryPlaceholder: "form.country_placeholder",
  formCustomerNote: "form.customer_note",
  formEmail: "form.email",
  formFirstName: "form.first_name",
  formLastName: "form.last_name",
  formPhone: "form.phone",
  formPostalCode: "form.postal_code",
  formTaxId: "form.tax_id",
  formValidationAddressMinLength: "form.validation.address_min_length",
  formValidationAddressRequired: "form.validation.address_required",
  formValidationCityMinLength: "form.validation.city_min_length",
  formValidationCityRequired: "form.validation.city_required",
  formValidationCompanyIdMinLength:
    "form.validation.company_id_min_length",
  formValidationCompanyIdRequired: "form.validation.company_id_required",
  formValidationCompanyNameMinLength:
    "form.validation.company_name_min_length",
  formValidationCompanyNameRequired:
    "form.validation.company_name_required",
  formValidationCountryInvalid: "form.validation.country_invalid",
  formValidationCountryRequired: "form.validation.country_required",
  formValidationEmailInvalid: "form.validation.email_invalid",
  formValidationEmailRequired: "form.validation.email_required",
  formValidationFirstNameMinLength:
    "form.validation.first_name_min_length",
  formValidationLastNameMinLength:
    "form.validation.last_name_min_length",
  formValidationPhoneInvalid: "form.validation.phone_invalid",
  formValidationPhoneMinDigits: "form.validation.phone_min_digits",
  formValidationPhoneRequired: "form.validation.phone_required",
  formValidationPostalCodeInvalid:
    "form.validation.postal_code_invalid",
  formValidationPostalCodeMinDigits:
    "form.validation.postal_code_min_digits",
  formValidationPostalCodeRequired:
    "form.validation.postal_code_required",
  formValidationTaxIdMinLength: "form.validation.tax_id_min_length",
  formValidationTaxIdRequired: "form.validation.tax_id_required",
  formVatId: "form.vat_id",
} as const

type FormStorefrontTextKey =
  (typeof FORM_STOREFRONT_TEXT_KEYS)[keyof typeof FORM_STOREFRONT_TEXT_KEYS]

export const FORM_DEFAULT_STOREFRONT_TEXT_MESSAGES = {
  [FORM_STOREFRONT_TEXT_KEYS.formAddress]: "Ulica a číslo domu",
  [FORM_STOREFRONT_TEXT_KEYS.formCity]: "Mesto",
  [FORM_STOREFRONT_TEXT_KEYS.formCompanyId]: "IČO",
  [FORM_STOREFRONT_TEXT_KEYS.formCompanyName]: "Názov firmy",
  [FORM_STOREFRONT_TEXT_KEYS.formCountry]: "Krajina",
  [FORM_STOREFRONT_TEXT_KEYS.formCountryPlaceholder]: "Vyberte krajinu",
  [FORM_STOREFRONT_TEXT_KEYS.formCustomerNote]:
    "Voliteľná poznámka pre zákaznícku podporu",
  [FORM_STOREFRONT_TEXT_KEYS.formEmail]: "E-mail",
  [FORM_STOREFRONT_TEXT_KEYS.formFirstName]: "Meno",
  [FORM_STOREFRONT_TEXT_KEYS.formLastName]: "Priezvisko",
  [FORM_STOREFRONT_TEXT_KEYS.formPhone]: "Telefón",
  [FORM_STOREFRONT_TEXT_KEYS.formPostalCode]: "PSČ",
  [FORM_STOREFRONT_TEXT_KEYS.formTaxId]: "DIČ",
  [FORM_STOREFRONT_TEXT_KEYS.formValidationAddressMinLength]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.addressMinLength,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationAddressRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.addressRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCityMinLength]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.cityMinLength,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCityRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.cityRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCompanyIdMinLength]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.companyIdMinLength,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCompanyIdRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.companyIdRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCompanyNameMinLength]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.companyNameMinLength,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCompanyNameRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.companyNameRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCountryInvalid]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.countryInvalid,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationCountryRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.countryRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationEmailInvalid]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.emailInvalid,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationEmailRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.emailRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationFirstNameMinLength]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.firstNameMinLength,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationLastNameMinLength]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.lastNameMinLength,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationPhoneInvalid]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.phoneInvalid,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationPhoneMinDigits]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.phoneMinDigits,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationPhoneRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.phoneRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationPostalCodeInvalid]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.postalCodeInvalid,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationPostalCodeMinDigits]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.postalCodeMinDigits,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationPostalCodeRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.postalCodeRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationTaxIdMinLength]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.taxIdMinLength,
  [FORM_STOREFRONT_TEXT_KEYS.formValidationTaxIdRequired]:
    DEFAULT_ADDRESS_VALIDATION_MESSAGES.taxIdRequired,
  [FORM_STOREFRONT_TEXT_KEYS.formVatId]: "IČ DPH",
} as const satisfies Record<FormStorefrontTextKey, string>
