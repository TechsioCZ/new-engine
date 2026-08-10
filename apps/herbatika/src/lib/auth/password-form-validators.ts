import { createChangeBlurContextualFieldValidators } from "@/lib/forms/validators/field-validator-factories"
import { passwordHasNumber } from "@/lib/forms/validators/shared"

import type {
  PasswordValidationMessages,
  ResetPasswordFormValues,
} from "./auth-validation-types"

export interface PasswordConfirmFieldApi {
  form: { getFieldValue: (name: "password") => unknown }
}

export const createPasswordValidator =
  (messages: PasswordValidationMessages) => (value: string) => {
    if (value.length === 0) {
      return messages.passwordRequired
    }
    if (value.length < 8) {
      return messages.passwordMinLength
    }
    return passwordHasNumber(value) ? undefined : messages.passwordNumber
  }

const createPasswordConfirmationValidator =
  (messages: PasswordValidationMessages) =>
  (password: string, confirmation: string) => {
    if (!confirmation) {
      return messages.confirmPasswordRequired
    }
    return password === confirmation ? undefined : messages.passwordMismatch
  }

export const createPasswordConfirmationFieldValidators = (
  messages: PasswordValidationMessages,
) => ({
  onChangeListenTo: ["password"] satisfies (keyof ResetPasswordFormValues)[],
  ...createChangeBlurContextualFieldValidators(
    ({
      value,
      fieldApi,
    }: {
      value: string
      fieldApi: PasswordConfirmFieldApi
    }) => {
      const passwordValue = fieldApi.form.getFieldValue("password")
      const password = typeof passwordValue === "string" ? passwordValue : ""
      return createPasswordConfirmationValidator(messages)(password, value)
    },
  ),
})

export const PASSWORD_REQUIREMENTS = [
  { id: "min-length", test: (password: string) => password.length >= 8 },
  { id: "has-number", test: passwordHasNumber },
] as const
