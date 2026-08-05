"use client"

import { useTranslations } from "next-intl"

import type { RegisterFormValidators } from "@/lib/auth/auth-form-validators"

import type {
  RegisterFieldChangeHandler,
  RegisterFormController,
} from "./register-form.types"

interface RegisterAccountTypeFieldProps {
  form: RegisterFormController
  onValueChange?: RegisterFieldChangeHandler
  validators: RegisterFormValidators["account_type"]
}

export const RegisterAccountTypeField = ({
  form,
  onValueChange,
  validators,
}: RegisterAccountTypeFieldProps) => {
  const tAuth = useTranslations("auth")
  const accountTypeItems = [
    {
      description: tAuth("register.retail_description"),
      label: tAuth("register.retail_label"),
      value: "retail",
    },
    {
      description: tAuth("register.wholesale_description"),
      label: tAuth("register.wholesale_label"),
      value: "wholesale",
    },
  ]

  return (
    <form.AppField name="account_type" validators={validators}>
      {(field) => (
        <field.RadioGroupField
          className="gap-300"
          id="auth-register-account-type"
          items={accountTypeItems}
          label={tAuth("register.account_type")}
          {...(onValueChange === undefined ? {} : { onValueChange })}
          orientation="horizontal"
          required
          size="sm"
          validationMode="blur"
          variant="subtle"
        />
      )}
    </form.AppField>
  )
}
