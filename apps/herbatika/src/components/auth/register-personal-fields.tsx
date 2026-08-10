"use client"

import { useTranslations } from "next-intl"

import type { RegisterFormValidators } from "@/lib/auth/auth-form-validators"

import type { RegisterFormController } from "./register-form.types"

interface RegisterPersonalFieldsProps {
  form: RegisterFormController
  validators: RegisterFormValidators
}

export const RegisterPersonalFields = ({
  form,
  validators,
}: RegisterPersonalFieldsProps) => {
  const tForm = useTranslations("form")

  return (
    <>
      <form.AppField name="first_name" validators={validators.first_name}>
        {(field) => (
          <field.TextField
            autoComplete="off"
            id="auth-register-first-name"
            label={tForm("first_name")}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <form.AppField name="last_name" validators={validators.last_name}>
        {(field) => (
          <field.TextField
            autoComplete="off"
            id="auth-register-last-name"
            label={tForm("last_name")}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="col-span-2">
        <form.AppField name="email" validators={validators.email}>
          {(field) => (
            <field.TextField
              autoComplete="off"
              id="auth-register-email"
              label={tForm("email")}
              required
              type="email"
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>
    </>
  )
}
