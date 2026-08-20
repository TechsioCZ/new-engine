import { normalizeCountryCode } from "@/lib/forms/country-options"
import { createOptionalPhoneNumberValidator } from "@/lib/forms/phone-number"
import type { AddressValidationMessages as AddressValidationMessageSet } from "@/lib/forms/validators/address-validation-messages"
import {
  createCustomerNameValidator,
  createEmailAddressValidator,
} from "@/lib/forms/validators/shared"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"

type AddressFieldValidator = (value: string) => string | undefined

export type { AddressValidationMessages } from "@/lib/forms/validators/address-validation-messages"

const POSTAL_CODE_ALLOWED_REGEX = /^[0-9\s-]+$/
const POSTAL_CODE_DIGIT_COUNT = {
  cz: 5,
  hu: 4,
  ro: 6,
  sk: 5,
} as const satisfies Record<HerbatikaCountryCode, number>

const createRequiredTextValidator =
  (
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
  messages: Pick<AddressValidationMessageSet, "phoneInvalid" | "phoneRequired">,
  countryCode: HerbatikaCountryCode
): AddressFieldValidator => {
  const validateOptionalPhoneNumber = createOptionalPhoneNumberValidator(
    messages.phoneInvalid,
    countryCode
  )

  return (value) =>
    value.trim() ? validateOptionalPhoneNumber(value) : messages.phoneRequired
}

const createPostalCodeValidator =
  (
    messages: Pick<
      AddressValidationMessageSet,
      "postalCodeInvalid" | "postalCodeRequired"
    >,
    countryCode: HerbatikaCountryCode
  ): AddressFieldValidator =>
  (value) => {
    const normalized = value.trim()

    if (!normalized) {
      return messages.postalCodeRequired
    }

    if (!POSTAL_CODE_ALLOWED_REGEX.test(normalized)) {
      return messages.postalCodeInvalid
    }

    return normalized.replace(/\D/g, "").length ===
      POSTAL_CODE_DIGIT_COUNT[countryCode]
      ? undefined
      : messages.postalCodeInvalid
  }

const createCountryCodeValidator =
  (
    messages: Pick<
      AddressValidationMessageSet,
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
  messages: AddressValidationMessageSet,
  countryCode: HerbatikaCountryCode
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
  phone: createRequiredPhoneNumberValidator(messages, countryCode),
  postalCode: createPostalCodeValidator(messages, countryCode),
  taxId: createRequiredTextValidator(
    messages.taxIdRequired,
    messages.taxIdMinLength,
    4
  ),
})
