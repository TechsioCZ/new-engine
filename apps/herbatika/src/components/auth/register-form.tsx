"use client"

import { useStore } from "@tanstack/react-form"
import { Button } from "@techsio/ui-kit/atoms/button"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import { RegisterAccountTypeField } from "@/components/auth/register-account-type-field"
import { RegisterWholesaleFields } from "@/components/auth/register-wholesale-fields"
import { useAppToast } from "@/hooks/use-app-toast"
import {
  createRegisterValidators,
  type RegisterFormValues,
} from "@/lib/auth/auth-form-validators"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { AuthFooter } from "./auth-footer"

type RegisterFormProps = {
  isBusy: boolean
  countryItems: SelectItem[]
  defaultValues: RegisterFormValues
  loginHref: string
  onSubmit: (values: RegisterFormValues) => Promise<string | null>
}

export const RegisterForm = ({
  isBusy,
  countryItems,
  defaultValues,
  loginHref,
  onSubmit,
}: RegisterFormProps) => {
  const tAuth = useTranslations("auth")
  const tForm = useTranslations("form")
  const toast = useAppToast()
  const registerValidators = useMemo(
    () =>
      createRegisterValidators({
        accountTypeRequired: tAuth("validation.account_type_required"),
        addressMinLength: tForm("validation.address_min_length"),
        addressRequired: tForm("validation.address_required"),
        cityMinLength: tForm("validation.city_min_length"),
        cityRequired: tForm("validation.city_required"),
        companyIdMinLength: tForm("validation.company_id_min_length"),
        companyIdRequired: tForm("validation.company_id_required"),
        companyNameMinLength: tForm("validation.company_name_min_length"),
        companyNameRequired: tForm("validation.company_name_required"),
        confirmPasswordRequired: tAuth(
          "validation.confirm_password_required"
        ),
        countryInvalid: tForm("validation.country_invalid"),
        countryRequired: tForm("validation.country_required"),
        emailInvalid: tForm("validation.email_invalid"),
        emailRequired: tForm("validation.email_required"),
        firstNameMinLength: tForm("validation.first_name_min_length"),
        lastNameMinLength: tForm("validation.last_name_min_length"),
        passwordMinLength: tAuth("validation.password_min_length"),
        passwordMismatch: tAuth("validation.password_mismatch"),
        passwordNumber: tAuth("validation.password_number"),
        passwordRequired: tAuth("validation.password_required"),
        phoneInvalid: tForm("validation.phone_invalid"),
        phoneMinDigits: tForm("validation.phone_min_digits"),
        phoneRequired: tForm("validation.phone_required"),
        postalCodeInvalid: tForm("validation.postal_code_invalid"),
        postalCodeMinDigits: tForm("validation.postal_code_min_digits"),
        postalCodeRequired: tForm("validation.postal_code_required"),
        taxIdMinLength: tForm("validation.tax_id_min_length"),
        taxIdRequired: tForm("validation.tax_id_required"),
        termsRequired: tAuth("validation.terms_required"),
      }),
    [tAuth, tForm]
  )

  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value, formApi }) => {
      const error = await onSubmit(value)
      if (error) {
        toast.error({ title: error })
        return
      }

      formApi.reset(defaultValues)
    },
  })
  const accountType = useStore(form.store, (state) => state.values.account_type)
  const isWholesaleAccount = accountType === "wholesale"

  return (
    <form
      autoComplete="off"
      className="grid gap-300"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        runDetachedPromise(form.handleSubmit())
      }}
    >
      <div className="col-span-2 flex flex-nowrap">
        <RegisterAccountTypeField
          form={form}
          validators={registerValidators.account_type}
        />
      </div>

      <form.AppField
        name="first_name"
        validators={registerValidators.first_name}
      >
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

      <form.AppField name="last_name" validators={registerValidators.last_name}>
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
        <form.AppField name="email" validators={registerValidators.email}>
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

      {isWholesaleAccount ? (
        <RegisterWholesaleFields
          countryItems={countryItems}
          form={form}
          validators={registerValidators}
        />
      ) : null}

      <form.AppField name="password" validators={registerValidators.password}>
        {(field) => (
          <div className="space-y-200">
            <field.TextField
              autoComplete="new-password"
              id="auth-register-password"
              label={tAuth("password")}
              required
              type="password"
              validationMode="blur"
            />
            <PasswordRequirements password={String(field.state.value ?? "")} />
          </div>
        )}
      </form.AppField>

      <form.AppField
        name="confirm_password"
        validators={registerValidators.confirm_password}
      >
        {(field) => (
          <field.TextField
            autoComplete="new-password"
            id="auth-register-confirm-password"
            label={tAuth("password_confirmation")}
            required
            type="password"
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="md:col-span-2">
        <form.AppField
          name="accept_terms"
          validators={registerValidators.accept_terms}
        >
          {(field) => (
            <field.CheckboxField
              id="auth-register-accept-terms"
              label={tAuth("register.accept_terms")}
              required
              size="sm"
            />
          )}
        </form.AppField>
      </div>

      <div className="md:col-span-2">
        <Button block isLoading={isBusy} size="sm" type="submit">
          {tAuth("register.submit")}
        </Button>
      </div>
      <div className="md:col-span-2">
        <AuthFooter
          href={loginHref}
          linkText={tAuth("sign_in")}
          text={tAuth("register.has_account")}
        />
      </div>
    </form>
  )
}
