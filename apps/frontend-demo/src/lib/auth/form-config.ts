import type { FormInput } from "@techsio/ui-kit/molecules/form-input"
import type { ComponentProps } from "react"

import { AUTH_FORM_CONFIG } from "./constants"

type FormInputProps = ComponentProps<typeof FormInput>

/**
 * Common form field configurations
 */
export const authFormFields = {
  email: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id || "email",
    label: "E-mail",
    type: "email",
    placeholder: AUTH_FORM_CONFIG.EMAIL_PLACEHOLDER,
    required: true,
    autoComplete: "email",
    //extraText: AUTH_FORM_CONFIG.EMAIL_HELP_TEXT,
    ...props,
  }),

  password: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id || "password",
    label: "Heslo",
    type: "password",
    placeholder: AUTH_FORM_CONFIG.PASSWORD_PLACEHOLDER,
    required: true,
    autoComplete: "current-password",
    ...props,
  }),

  newPassword: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id || "password",
    label: "Heslo",
    type: "password",
    placeholder: AUTH_FORM_CONFIG.PASSWORD_PLACEHOLDER,
    required: true,
    autoComplete: "new-password",
    //extraText: AUTH_FORM_CONFIG.PASSWORD_HELP_TEXT,
    ...props,
  }),

  confirmPassword: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id || "confirmPassword",
    label: "Potvrdit heslo",
    type: "password",
    placeholder: AUTH_FORM_CONFIG.PASSWORD_PLACEHOLDER,
    required: true,
    autoComplete: "new-password",
    ...props,
  }),

  firstName: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id || "firstName",
    label: "Jméno",
    type: "text",
    placeholder: "Jan",
    ...props,
  }),

  lastName: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id || "lastName",
    label: "Příjmení",
    type: "text",
    placeholder: "Novák",
    ...props,
  }),
}

/**
 * Helper to apply loading state to form field
 */
export function withLoading(
  fieldProps: FormInputProps,
  isLoading: boolean
): FormInputProps {
  return {
    ...fieldProps,
    disabled: isLoading,
  }
}
