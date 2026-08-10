import type { FormInput } from "@techsio/ui-kit/molecules/form-input"
import type { ComponentProps } from "react"

import { AUTH_FORM_CONFIG } from "./constants"

type FormInputProps = ComponentProps<typeof FormInput>

/**
 * Common form field configurations
 */
export const authFormFields = {
  confirmPassword: (props?: Partial<FormInputProps>): FormInputProps => ({
    autoComplete: "new-password",
    id: props?.id ?? "confirmPassword",
    label: "Potvrdit heslo",
    placeholder: AUTH_FORM_CONFIG.PASSWORD_PLACEHOLDER,
    required: true,
    type: "password",
    ...props,
  }),

  email: (props?: Partial<FormInputProps>): FormInputProps => ({
    autoComplete: "email",
    id: props?.id ?? "email",
    label: "E-mail",
    placeholder: AUTH_FORM_CONFIG.EMAIL_PLACEHOLDER,
    required: true,
    type: "email",
    //extraText: AUTH_FORM_CONFIG.EMAIL_HELP_TEXT,
    ...props,
  }),

  firstName: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id ?? "firstName",
    label: "Jméno",
    placeholder: "Jan",
    type: "text",
    ...props,
  }),

  lastName: (props?: Partial<FormInputProps>): FormInputProps => ({
    id: props?.id ?? "lastName",
    label: "Příjmení",
    placeholder: "Novák",
    type: "text",
    ...props,
  }),

  newPassword: (props?: Partial<FormInputProps>): FormInputProps => ({
    autoComplete: "new-password",
    id: props?.id ?? "password",
    label: "Heslo",
    placeholder: AUTH_FORM_CONFIG.PASSWORD_PLACEHOLDER,
    required: true,
    type: "password",
    //extraText: AUTH_FORM_CONFIG.PASSWORD_HELP_TEXT,
    ...props,
  }),

  password: (props?: Partial<FormInputProps>): FormInputProps => ({
    autoComplete: "current-password",
    id: props?.id ?? "password",
    label: "Heslo",
    placeholder: AUTH_FORM_CONFIG.PASSWORD_PLACEHOLDER,
    required: true,
    type: "password",
    ...props,
  }),
}

/**
 * Helper to apply loading state to form field
 */
export const withLoading = (
  fieldProps: FormInputProps,
  isLoading: boolean,
): FormInputProps => ({
  ...fieldProps,
  disabled: isLoading,
})
