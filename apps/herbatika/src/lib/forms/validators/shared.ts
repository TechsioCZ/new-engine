const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_NUMBER_REGEX = /\d/
const PHONE_ALLOWED_REGEX = /^[0-9+\s()-]+$/

export const validateCustomerName = (
  value: string,
  label: "Meno" | "Priezvisko"
) => {
  if (value.trim().length < 2) {
    return `${label} musí mať aspoň 2 znaky.`
  }

  return
}

export const validateEmailAddress = (value: string) => {
  if (!value.trim()) {
    return "Zadajte e-mail."
  }

  if (!EMAIL_REGEX.test(value.trim())) {
    return "Zadajte platný e-mail."
  }

  return
}

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

export const validateOptionalPhoneNumber = (value: string) => {
  const normalized = value.trim()

  if (!normalized) {
    return
  }

  if (!PHONE_ALLOWED_REGEX.test(normalized)) {
    return "Zadajte platné telefónne číslo."
  }

  const digitCount = normalized.replace(/\D/g, "").length

  if (digitCount < 7) {
    return "Telefónne číslo musí obsahovať aspoň 7 číslic."
  }

  return
}

export const passwordHasNumber = (password: string) =>
  PASSWORD_NUMBER_REGEX.test(password)
