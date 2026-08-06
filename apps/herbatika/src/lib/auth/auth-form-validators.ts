import { createAddressFieldValidators } from "@/lib/forms/validators/address"
import type { AddressValidationMessages } from "@/lib/forms/validators/address"
import {
  createChangeBlurContextualFieldValidators,
  createChangeBlurFieldValidators,
  createChangeBlurSubmitScopedFieldValidators,
} from "@/lib/forms/validators/field-validator-factories"
import {
  createEmailAddressValidator,
  passwordHasNumber,
  validateRequiredAgreement,
} from "@/lib/forms/validators/shared"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

export interface LoginFormValues {
  email: string
  password: string
}

type RegisterAccountType = "retail" | "wholesale"

export interface RegisterFormValues {
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

export interface ForgotPasswordFormValues {
  email: string
}

export interface ResetPasswordFormValues {
  password: string
  confirm_password: string
}

interface ConfirmPasswordFieldApi {
  form: {
    getFieldValue: (name: "password") => unknown
  }
}

export const isWholesaleRegistration = (values: RegisterFormValues) =>
  values.account_type === "wholesale"

interface PasswordValidationMessages {
  confirmPasswordRequired: string
  passwordMismatch: string
  passwordMinLength: string
  passwordNumber: string
  passwordRequired: string
}

export type AuthValidationMessages = AddressValidationMessages &
  PasswordValidationMessages & {
    accountTypeRequired: string
    termsRequired: string
  }

interface LoginSubmitErrorMessages {
  failed: string
  invalidCredentials: string
}

interface RegisterSubmitErrorMessages {
  emailExists: string
  failed: string
}

const createWholesaleFieldValidators = <TFormValues>(
  validator: (value: string) => string | undefined,
  isWholesale: (values: TFormValues) => boolean,
) => createChangeBlurSubmitScopedFieldValidators(validator, isWholesale)

const createPasswordValidator =
  (messages: PasswordValidationMessages) => (value: string) => {
    let validationError: string | undefined

    if (value.length === 0) {
      validationError = messages.passwordRequired
    } else if (value.length < 8) {
      validationError = messages.passwordMinLength
    } else if (!passwordHasNumber(value)) {
      validationError = messages.passwordNumber
    }

    return validationError
  }

const createPasswordConfirmationValidator =
  (messages: PasswordValidationMessages) =>
  (password: string, confirmPassword: string) => {
    if (!confirmPassword) {
      return messages.confirmPasswordRequired
    }

    return password === confirmPassword ? undefined : messages.passwordMismatch
  }

const createEmailValidator = (
  messages: Pick<AddressValidationMessages, "emailInvalid" | "emailRequired">,
) =>
  createEmailAddressValidator({
    invalid: messages.emailInvalid,
    required: messages.emailRequired,
  })

export const createLoginValidators = (
  messages: Pick<
    AuthValidationMessages,
    "emailInvalid" | "emailRequired" | "passwordRequired"
  >,
) => ({
  email: createChangeBlurFieldValidators(createEmailValidator(messages)),
  password: createChangeBlurFieldValidators((value: string) =>
    value ? undefined : messages.passwordRequired,
  ),
})

export const PASSWORD_REQUIREMENTS = [
  {
    id: "min-length",
    test: (password: string) => password.length >= 8,
  },
  {
    id: "has-number",
    test: passwordHasNumber,
  },
] as const

export const createRegisterValidators = (messages: AuthValidationMessages) => {
  const addressValidators = createAddressFieldValidators(messages)
  const validatePassword = createPasswordValidator(messages)
  const validatePasswordConfirmation =
    createPasswordConfirmationValidator(messages)
  const createWholesaleValidator = (
    validator: (value: string) => string | undefined,
  ) => createWholesaleFieldValidators(validator, isWholesaleRegistration)

  return {
    accept_terms: createChangeBlurFieldValidators((value: boolean) =>
      validateRequiredAgreement(value, messages.termsRequired),
    ),
    account_type: createChangeBlurFieldValidators((value: string) =>
      value === "retail" || value === "wholesale"
        ? undefined
        : messages.accountTypeRequired,
    ),
    billing_address_1: createWholesaleValidator(addressValidators.address1),
    billing_city: createWholesaleValidator(addressValidators.city),
    billing_country_code: createWholesaleValidator(
      addressValidators.countryCode,
    ),
    billing_postal_code: createWholesaleValidator(addressValidators.postalCode),
    company_identifier: createWholesaleValidator(addressValidators.companyId),
    company_name: createWholesaleValidator(addressValidators.company),
    confirm_password: {
      onChangeListenTo: ["password"] as (keyof RegisterFormValues)[],
      ...createChangeBlurContextualFieldValidators(
        ({
          value,
          fieldApi,
        }: {
          value: string
          fieldApi: ConfirmPasswordFieldApi
        }) => {
          const passwordValue = fieldApi.form.getFieldValue("password")
          const password =
            typeof passwordValue === "string" ? passwordValue : ""

          return validatePasswordConfirmation(password, value)
        },
      ),
    },
    email: createChangeBlurFieldValidators(addressValidators.email),
    first_name: createChangeBlurFieldValidators(addressValidators.firstName),
    last_name: createChangeBlurFieldValidators(addressValidators.lastName),
    password: createChangeBlurFieldValidators(validatePassword),
  }
}

export type RegisterFormValidators = ReturnType<typeof createRegisterValidators>

interface ResetPasswordConfirmFieldApi {
  form: {
    getFieldValue: (name: "password") => unknown
  }
}

export const createForgotPasswordValidators = (
  messages: Pick<AuthValidationMessages, "emailInvalid" | "emailRequired">,
) => ({
  email: createChangeBlurFieldValidators(createEmailValidator(messages)),
})

export const createResetPasswordValidators = (
  messages: PasswordValidationMessages,
) => {
  const validatePassword = createPasswordValidator(messages)
  const validatePasswordConfirmation =
    createPasswordConfirmationValidator(messages)

  return {
    confirm_password: {
      onChangeListenTo: ["password"] as (keyof ResetPasswordFormValues)[],
      ...createChangeBlurContextualFieldValidators(
        ({
          value,
          fieldApi,
        }: {
          value: string
          fieldApi: ResetPasswordConfirmFieldApi
        }) => {
          const passwordValue = fieldApi.form.getFieldValue("password")
          const password =
            typeof passwordValue === "string" ? passwordValue : ""

          return validatePasswordConfirmation(password, value)
        },
      ),
    },
    password: createChangeBlurFieldValidators(validatePassword),
  }
}

export const resolveLoginSubmitError = (
  error: unknown,
  messages: LoginSubmitErrorMessages,
) => {
  const message = resolveErrorMessage(error, "")
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("credential") ||
    normalizedMessage.includes("401") ||
    normalizedMessage.includes("403")
  ) {
    return messages.invalidCredentials
  }

  return messages.failed
}

export const resolveRegisterSubmitError = (
  error: unknown,
  messages: RegisterSubmitErrorMessages,
) => {
  const message = resolveErrorMessage(error, "")
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("identity with email already exists") ||
    normalizedMessage.includes("email already exists")
  ) {
    return messages.emailExists
  }

  return messages.failed
}
