const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_NUMBER_REGEX = /\d/
const PHONE_ALLOWED_REGEX = /^[0-9+\s()-]+$/

const validateCustomerNameWithMessage = (
  value: string,
  minLengthMessage: string
) => (value.trim().length < 2 ? minLengthMessage : undefined)

export const createCustomerNameValidator =
  (minLengthMessage: string) => (value: string) =>
    validateCustomerNameWithMessage(value, minLengthMessage)

interface EmailValidationMessages {
  invalid: string
  required: string
}

export const createEmailAddressValidator =
  ({ invalid, required }: EmailValidationMessages) =>
  (value: string) => {
    if (!value.trim()) {
      return required
    }

    if (!EMAIL_REGEX.test(value.trim())) {
      return invalid
    }

    return
  }

export const validateRequiredAgreement = (value: boolean, message: string) => {
  if (!value) {
    return message
  }

  return
}

interface PhoneValidationMessages {
  invalid: string
  minDigits: string
}

export const createOptionalPhoneNumberValidator =
  ({ invalid, minDigits }: PhoneValidationMessages) =>
  (value: string) => {
    const normalized = value.trim()

    if (!normalized) {
      return
    }

    if (!PHONE_ALLOWED_REGEX.test(normalized)) {
      return invalid
    }

    const digitCount = normalized.replaceAll(/\D/g, "").length

    if (digitCount < 7) {
      return minDigits
    }

    return
  }

export const passwordHasNumber = (password: string) =>
  PASSWORD_NUMBER_REGEX.test(password)
