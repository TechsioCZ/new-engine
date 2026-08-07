"use client"

import { useTranslations } from "next-intl"
import type { RegisterFormValidators } from "@/lib/auth/auth-form-validators"
import type {
  RegisterFieldChangeHandler,
  RegisterFormController,
} from "./register-form.types"

type RegisterAccountTypeFieldProps = {
  form: RegisterFormController
  onValueChange?: RegisterFieldChangeHandler
  validators: RegisterFormValidators["account_type"]
}

export function RegisterAccountTypeField({
  form,
  onValueChange,
  validators,
}: RegisterAccountTypeFieldProps) {
  const tAuth = useTranslations("auth")
  const accountTypeItems = [
    {
      value: "retail",
      label: tAuth("register.retail_label"),
      description: tAuth("register.retail_description"),
    },
    {
      value: "wholesale",
      label: tAuth("register.wholesale_label"),
      description: tAuth("register.wholesale_description"),
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
          onValueChange={onValueChange}
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
