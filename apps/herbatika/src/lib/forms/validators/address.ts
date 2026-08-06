import { normalizeCountryCode } from "@/lib/forms/country-options"
import type { AddressValidationMessages as AddressValidationMessageSet } from "@/lib/forms/validators/address-validation-messages"
import {
  createCustomerNameValidator,
  createEmailAddressValidator,
  createOptionalPhoneNumberValidator,
} from "@/lib/forms/validators/shared"

type AddressFieldValidator = (value: string) => string | undefined

export type { AddressValidationMessages } from "@/lib/forms/validators/address-validation-messages"

const POSTAL_CODE_ALLOWED_REGEX = /^[0-9\s-]+$/u

const createRequiredTextValidator =
  (
    requiredMessage: string,
    minLengthMessage: string,
    minLength = 2,
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
    AddressValidationMessageSet,
    "phoneInvalid" | "phoneMinDigits" | "phoneRequired"
  >,
): AddressFieldValidator => {
  const validateOptionalPhoneNumber = createOptionalPhoneNumberValidator({
    invalid: messages.phoneInvalid,
    minDigits: messages.phoneMinDigits,
  })

  return (value) =>
    value.trim() ? validateOptionalPhoneNumber(value) : messages.phoneRequired
}

const createPostalCodeValidator =
  (
    messages: Pick<
      AddressValidationMessageSet,
      "postalCodeInvalid" | "postalCodeMinDigits" | "postalCodeRequired"
    >,
  ): AddressFieldValidator =>
  (value) => {
    const normalized = value.trim()

    if (!normalized) {
      return messages.postalCodeRequired
    }

    if (!POSTAL_CODE_ALLOWED_REGEX.test(normalized)) {
      return messages.postalCodeInvalid
    }

    return normalized.replaceAll(/\D/gu, "").length < 4
      ? messages.postalCodeMinDigits
      : undefined
  }

const createCountryCodeValidator =
  (
    messages: Pick<
      AddressValidationMessageSet,
      "countryInvalid" | "countryRequired"
    >,
  ): AddressFieldValidator =>
  (value) => {
    if (!value.trim()) {
      return messages.countryRequired
    }

    return (normalizeCountryCode(value) ?? "").length > 0
      ? undefined
      : messages.countryInvalid
  }

export const createAddressFieldValidators = (
  messages: AddressValidationMessageSet,
) => ({
  address1: createRequiredTextValidator(
    messages.addressRequired,
    messages.addressMinLength,
  ),
  city: createRequiredTextValidator(
    messages.cityRequired,
    messages.cityMinLength,
  ),
  company: createRequiredTextValidator(
    messages.companyNameRequired,
    messages.companyNameMinLength,
  ),
  companyId: createRequiredTextValidator(
    messages.companyIdRequired,
    messages.companyIdMinLength,
    4,
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
    4,
  ),
})
