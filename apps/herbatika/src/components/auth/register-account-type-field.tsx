"use client"

import { registerValidators } from "@/lib/auth/auth-form-validators"
import type {
  RegisterFieldChangeHandler,
  RegisterFormController,
} from "./register-form.types"

type RegisterAccountTypeFieldProps = {
  form: RegisterFormController
  onValueChange?: RegisterFieldChangeHandler
}

const REGISTER_ACCOUNT_TYPE_ITEMS = [
  {
    value: "retail",
    label: "Bežný zákazník",
    description: "Registrácia bez žiadosti o veľkoobchodný účet.",
  },
  {
    value: "wholesale",
    label: "VO zákazník",
    description: "Po registrácii odošleme žiadosť na schválenie.",
  },
]

export function RegisterAccountTypeField({
  form,
  onValueChange,
}: RegisterAccountTypeFieldProps) {
  return (
    <form.AppField
      name="account_type"
      validators={registerValidators.account_type}
    >
      {(field) => (
        <field.RadioGroupField
          className="gap-300"
          id="auth-register-account-type"
          items={REGISTER_ACCOUNT_TYPE_ITEMS}
          label="Typ účtu"
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
