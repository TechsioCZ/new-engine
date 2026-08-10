import type { AddressValidationMessages } from "@/lib/forms/validators/address"
import { createChangeBlurFieldValidators } from "@/lib/forms/validators/field-validator-factories"
import { createEmailAddressValidator } from "@/lib/forms/validators/shared"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"

import type {
  AuthValidationMessages,
  PasswordValidationMessages,
} from "./auth-validation-types"
import {
  createPasswordConfirmationFieldValidators,
  createPasswordValidator,
} from "./password-form-validators"

export type {
  AuthValidationMessages,
  ForgotPasswordFormValues,
  LoginFormValues,
  RegisterFormValues,
  ResetPasswordFormValues,
} from "./auth-validation-types"
export {
  createRegisterValidators,
  isWholesaleRegistration,
} from "./register-form-validators"
export type { RegisterFormValidators } from "./register-form-validators"
export { PASSWORD_REQUIREMENTS } from "./password-form-validators"

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

export const createForgotPasswordValidators = (
  messages: Pick<AuthValidationMessages, "emailInvalid" | "emailRequired">,
) => ({
  email: createChangeBlurFieldValidators(createEmailValidator(messages)),
})

export const createResetPasswordValidators = (
  messages: PasswordValidationMessages,
) => ({
  confirm_password: createPasswordConfirmationFieldValidators(messages),
  password: createChangeBlurFieldValidators(createPasswordValidator(messages)),
})

interface LoginSubmitErrorMessages {
  failed: string
  invalidCredentials: string
}
interface RegisterSubmitErrorMessages {
  emailExists: string
  failed: string
}

const LOGIN_ERROR_MARKERS = new Set(["invalid", "credential", "401", "403"])
const LOGIN_ERROR_MARKER_PATTERN = /invalid|credential|401|403/gu
const REGISTER_ERROR_MARKERS = new Set([
  "identity with email already exists",
  "email already exists",
])
const REGISTER_ERROR_MARKER_PATTERN =
  /identity with email already exists|email already exists/gu

const includesAny = (
  value: string,
  pattern: RegExp,
  candidates: ReadonlySet<string>,
) => (value.match(pattern) ?? []).some((candidate) => candidates.has(candidate))

export const resolveLoginSubmitError = (
  error: unknown,
  messages: LoginSubmitErrorMessages,
) =>
  includesAny(
    resolveErrorMessage(error, "").toLowerCase(),
    LOGIN_ERROR_MARKER_PATTERN,
    LOGIN_ERROR_MARKERS,
  )
    ? messages.invalidCredentials
    : messages.failed

export const resolveRegisterSubmitError = (
  error: unknown,
  messages: RegisterSubmitErrorMessages,
) =>
  includesAny(
    resolveErrorMessage(error, "").toLowerCase(),
    REGISTER_ERROR_MARKER_PATTERN,
    REGISTER_ERROR_MARKERS,
  )
    ? messages.emailExists
    : messages.failed
