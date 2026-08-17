const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_NUMBER_REGEX = /\d/

const validateCustomerNameWithMessage = (
  value: string,
  minLengthMessage: string
) => (value.trim().length < 2 ? minLengthMessage : undefined)

export const createCustomerNameValidator =
  (minLengthMessage: string) => (value: string) =>
    validateCustomerNameWithMessage(value, minLengthMessage)

export const validateCustomerName = (
  value: string,
  label: "Meno" | "Priezvisko"
) => validateCustomerNameWithMessage(value, `${label} musí mať aspoň 2 znaky.`)

type EmailValidationMessages = {
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

export const validateEmailAddress = createEmailAddressValidator({
  invalid: "Zadajte platný e-mail.",
  required: "Zadajte e-mail.",
})

export const validateLoginPassword = (value: string) => {
  if (!value) {
    return "Zadajte heslo."
  }

  return
}

export const validateRegisterPassword = (value: string) => {
  if (value.length < 8) {
    return "Heslo musí mať aspoň 8 znakov."
  }

  if (!PASSWORD_NUMBER_REGEX.test(value)) {
    return "Heslo musí obsahovať aspoň jednu číslicu."
  }

  return
}

export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string
) => {
  if (!confirmPassword) {
    return "Potvrďte heslo."
  }

  if (password !== confirmPassword) {
    return "Heslá sa nezhodujú."
  }

  return
}

export const validateRequiredAgreement = (value: boolean, message: string) => {
  if (!value) {
    return message
  }

  return
}

export const passwordHasNumber = (password: string) =>
  PASSWORD_NUMBER_REGEX.test(password)
