import { normalizeCountryCode } from "@/lib/forms/country-options"
import {
  DEFAULT_ADDRESS_VALIDATION_MESSAGES,
  type AddressValidationMessages,
} from "@/lib/forms/validators/address-validation-messages"
import {
  createCustomerNameValidator,
  createEmailAddressValidator,
  createOptionalPhoneNumberValidator,
} from "@/lib/forms/validators/shared"

type AddressFieldValidator = (value: string) => string | undefined

export type { AddressValidationMessages }

const POSTAL_CODE_ALLOWED_REGEX = /^[0-9\s-]+$/

const createRequiredTextValidator = (
  requiredMessage: string,
  minLengthMessage: string,
  minLength = 2
): AddressFieldValidator =>
  (value) => {
    const normalized = value.trim()

    if (!normalized) {
      return requiredMessage
    }

    return normalized.length < minLength ? minLengthMessage : undefined
  }

const createRequiredPhoneNumberValidator = (
  messages: Pick<
    AddressValidationMessages,
    "phoneInvalid" | "phoneMinDigits" | "phoneRequired"
  >
): AddressFieldValidator => {
  const validateOptionalPhoneNumber = createOptionalPhoneNumberValidator({
    invalid: messages.phoneInvalid,
    minDigits: messages.phoneMinDigits,
  })

  return (value) =>
    value.trim() ? validateOptionalPhoneNumber(value) : messages.phoneRequired
}

const createPostalCodeValidator = (
  messages: Pick<
    AddressValidationMessages,
    "postalCodeInvalid" | "postalCodeMinDigits" | "postalCodeRequired"
  >
): AddressFieldValidator =>
  (value) => {
    const normalized = value.trim()

    if (!normalized) {
      return messages.postalCodeRequired
    }

    if (!POSTAL_CODE_ALLOWED_REGEX.test(normalized)) {
      return messages.postalCodeInvalid
    }

    return normalized.replace(/\D/g, "").length < 4
      ? messages.postalCodeMinDigits
      : undefined
  }

const createCountryCodeValidator = (
  messages: Pick<
    AddressValidationMessages,
    "countryInvalid" | "countryRequired"
  >
): AddressFieldValidator =>
  (value) => {
    if (!value.trim()) {
      return messages.countryRequired
    }

    return normalizeCountryCode(value) ? undefined : messages.countryInvalid
  }

export const createAddressFieldValidators = (
  messages: AddressValidationMessages
) => ({
  address1: createRequiredTextValidator(
    messages.addressRequired,
    messages.addressMinLength
  ),
  city: createRequiredTextValidator(
    messages.cityRequired,
    messages.cityMinLength
  ),
  company: createRequiredTextValidator(
    messages.companyNameRequired,
    messages.companyNameMinLength
  ),
  companyId: createRequiredTextValidator(
    messages.companyIdRequired,
    messages.companyIdMinLength,
    4
  ),
  countryCode: createCountryCodeValidator(messages),
  email: createEmailAddressValidator({
    invalid: messages.emailInvalid,
    required: messages.emailRequired,
  }),
  firstName: createCustomerNameValidator(messages.firstNameMinLength),
  lastName: createCustomerNameValidator(messages.lastNameMinLength),
  phone: createRequiredPhoneNumberValidator(messages),
  postalCode: createPostalCodeValidator(messages),
  taxId: createRequiredTextValidator(
    messages.taxIdRequired,
    messages.taxIdMinLength,
    4
  ),
})

export const addressFieldValidators = createAddressFieldValidators(
  DEFAULT_ADDRESS_VALIDATION_MESSAGES
)
