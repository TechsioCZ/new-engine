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

export const DEFAULT_ADDRESS_VALIDATION_MESSAGES: AddressValidationMessages = {
  addressMinLength: "Ulica a číslo domu musí mať aspoň 2 znaky.",
  addressRequired: "Zadajte ulicu a číslo domu.",
  cityMinLength: "Mesto musí mať aspoň 2 znaky.",
  cityRequired: "Zadajte mesto.",
  companyIdMinLength: "IČO musí mať aspoň 4 znaky.",
  companyIdRequired: "Zadajte IČO.",
  companyNameMinLength: "Názov firmy musí mať aspoň 2 znaky.",
  companyNameRequired: "Zadajte názov firmy.",
  countryInvalid: "Vyberte platnú krajinu.",
  countryRequired: "Vyberte krajinu.",
  emailInvalid: "Zadajte platný e-mail.",
  emailRequired: "Zadajte e-mail.",
  firstNameMinLength: "Meno musí mať aspoň 2 znaky.",
  lastNameMinLength: "Priezvisko musí mať aspoň 2 znaky.",
  phoneInvalid: "Zadajte platné telefónne číslo.",
  phoneMinDigits: "Telefónne číslo musí obsahovať aspoň 7 číslic.",
  phoneRequired: "Zadajte telefón.",
  postalCodeInvalid: "Zadajte platné PSČ.",
  postalCodeMinDigits: "PSČ musí obsahovať aspoň 4 číslice.",
  postalCodeRequired: "Zadajte PSČ.",
  taxIdMinLength: "DIČ musí mať aspoň 4 znaky.",
  taxIdRequired: "Zadajte DIČ.",
}
