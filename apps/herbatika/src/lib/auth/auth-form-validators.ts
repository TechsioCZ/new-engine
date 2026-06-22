import { checkoutAddressFieldValidators } from "@/lib/forms/checkout/address-validators"
import {
  createChangeBlurContextualFieldValidators,
  createChangeBlurFieldValidators,
  createChangeBlurSubmitScopedFieldValidators,
} from "@/lib/forms/validators/field-validator-factories"
import {
  passwordHasNumber,
  validateCustomerName,
  validateEmailAddress,
  validateLoginPassword,
  validatePasswordConfirmation,
  validateRegisterPassword,
  validateRequiredAgreement,
} from "@/lib/forms/validators/shared"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

export type LoginFormValues = {
  email: string
  password: string
}

export type RegisterAccountType = "retail" | "wholesale"

export type RegisterFormValues = {
  account_type: RegisterAccountType
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
  company_name: string
  company_identifier: string
  billing_address_1: string
  billing_address_2: string
  billing_city: string
  billing_postal_code: string
  billing_country_code: string
  accept_terms: boolean
}

export type ForgotPasswordFormValues = {
  email: string
}

export type ResetPasswordFormValues = {
  password: string
  confirm_password: string
}

type ConfirmPasswordFieldApi = {
  form: {
    getFieldValue: (name: "password") => unknown
  }
}

export const isWholesaleRegistration = (values: RegisterFormValues) =>
  values.account_type === "wholesale"

const validateRegisterAccountType = (value: string) =>
  value === "retail" || value === "wholesale" ? undefined : "Vyberte typ účtu."

const createWholesaleFieldValidators = (
  validator: (value: string) => string | undefined
) =>
  createChangeBlurSubmitScopedFieldValidators(
    validator,
    isWholesaleRegistration
  )

export const loginValidators = {
  email: createChangeBlurFieldValidators(validateEmailAddress),
  password: createChangeBlurFieldValidators(validateLoginPassword),
}

export const PASSWORD_REQUIREMENTS = [
  {
    id: "min-length",
    label: "Aspoň 8 znakov",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "has-number",
    label: "Aspoň jedna číslica",
    test: (password: string) => passwordHasNumber(password),
  },
] as const

export const registerValidators = {
  account_type: createChangeBlurFieldValidators(validateRegisterAccountType),
  first_name: createChangeBlurFieldValidators((value: string) =>
    validateCustomerName(value, "Meno")
  ),
  last_name: createChangeBlurFieldValidators((value: string) =>
    validateCustomerName(value, "Priezvisko")
  ),
  email: createChangeBlurFieldValidators(validateEmailAddress),
  password: createChangeBlurFieldValidators(validateRegisterPassword),
  confirm_password: {
    onChangeListenTo: ["password"] as Array<keyof RegisterFormValues>,
    ...createChangeBlurContextualFieldValidators(
      ({
        value,
        fieldApi,
      }: {
        value: string
        fieldApi: ConfirmPasswordFieldApi
      }) => {
        const password =
          (fieldApi.form.getFieldValue("password") as string | undefined) ?? ""

        return validatePasswordConfirmation(password, value)
      }
    ),
  },
  accept_terms: createChangeBlurFieldValidators((value: boolean) =>
    validateRequiredAgreement(
      value,
      "Potrebujeme súhlas s obchodnými podmienkami."
    )
  ),
  company_name: createWholesaleFieldValidators(
    checkoutAddressFieldValidators.company
  ),
  company_identifier: createWholesaleFieldValidators(
    checkoutAddressFieldValidators.companyId
  ),
  billing_address_1: createWholesaleFieldValidators(
    checkoutAddressFieldValidators.address1
  ),
  billing_city: createWholesaleFieldValidators(
    checkoutAddressFieldValidators.city
  ),
  billing_postal_code: createWholesaleFieldValidators(
    checkoutAddressFieldValidators.postalCode
  ),
  billing_country_code: createWholesaleFieldValidators(
    checkoutAddressFieldValidators.countryCode
  ),
}

export const forgotPasswordValidators = {
  email: createChangeBlurFieldValidators(validateEmailAddress),
}

type ResetPasswordConfirmFieldApi = {
  form: {
    getFieldValue: (name: "password") => unknown
  }
}

export const resetPasswordValidators = {
  password: createChangeBlurFieldValidators(validateRegisterPassword),
  confirm_password: {
    onChangeListenTo: ["password"] as Array<keyof ResetPasswordFormValues>,
    ...createChangeBlurContextualFieldValidators(
      ({
        value,
        fieldApi,
      }: {
        value: string
        fieldApi: ResetPasswordConfirmFieldApi
      }) => {
        const password =
          (fieldApi.form.getFieldValue("password") as string | undefined) ?? ""

        return validatePasswordConfirmation(password, value)
      }
    ),
  },
}

export const resolveLoginSubmitError = (error: unknown) => {
  const message = resolveErrorMessage(error, "")
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("credential") ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("403")
  ) {
    return "Nesprávny e-mail alebo heslo."
  }

  return message || "Prihlásenie sa nepodarilo. Skúste to prosím znovu."
}

export const resolveRegisterSubmitError = (error: unknown) => {
  const message = resolveErrorMessage(error, "")
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("identity with email already exists") ||
    normalizedMessage.includes("email already exists")
  ) {
    return "Účet s týmto e-mailom už existuje. Prihláste sa alebo použite obnovu hesla."
  }

  return message || "Registrácia sa nepodarila. Skúste to prosím znovu."
}
