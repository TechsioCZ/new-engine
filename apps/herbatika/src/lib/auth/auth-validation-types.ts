import type { AddressValidationMessages } from "@/lib/forms/validators/address"

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

export interface PasswordValidationMessages {
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
