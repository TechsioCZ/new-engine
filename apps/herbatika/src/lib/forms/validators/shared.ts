const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u
const PASSWORD_NUMBER_REGEX = /\d/u
const PHONE_ALLOWED_REGEX = /^[0-9+\s()-]+$/u

const validateCustomerNameWithMessage = (
  value: string,
  minLengthMessage: string,
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
    const normalized = value.trim()
    let validationError: string | undefined

    if (normalized.length === 0) {
      validationError = required
    } else if (!EMAIL_REGEX.test(normalized)) {
      validationError = invalid
    }

    return validationError
  }

export const validateRequiredAgreement = (value: boolean, message: string) =>
  value ? undefined : message

interface PhoneValidationMessages {
  invalid: string
  minDigits: string
}

export const createOptionalPhoneNumberValidator =
  ({ invalid, minDigits }: PhoneValidationMessages) =>
  (value: string) => {
    const normalized = value.trim()
    let validationError: string | undefined

    if (normalized.length > 0) {
      if (!PHONE_ALLOWED_REGEX.test(normalized)) {
        validationError = invalid
      } else if (normalized.replaceAll(/\D/gu, "").length < 7) {
        validationError = minDigits
      }
    }

    return validationError
  }

export const passwordHasNumber = (password: string) =>
  PASSWORD_NUMBER_REGEX.test(password)
