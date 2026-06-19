"use client"

import { useStore } from "@tanstack/react-form"
import { Button } from "@techsio/ui-kit/atoms/button"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { PasswordRequirements } from "@/components/auth/password-requirements"
import { RegisterAccountTypeField } from "@/components/auth/register-account-type-field"
import { RegisterWholesaleFields } from "@/components/auth/register-wholesale-fields"
import { useAppToast } from "@/hooks/use-app-toast"
import {
  type RegisterFormValues,
  registerValidators,
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
  const toast = useAppToast()

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
        <RegisterAccountTypeField form={form} />
      </div>

      <form.AppField
        name="first_name"
        validators={registerValidators.first_name}
      >
        {(field) => (
          <field.TextField
            autoComplete="off"
            id="auth-register-first-name"
            label="Meno"
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
            label="Priezvisko"
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
              label="E-mailová adresa"
              required
              type="email"
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>

      {isWholesaleAccount ? (
        <RegisterWholesaleFields countryItems={countryItems} form={form} />
      ) : null}

      <form.AppField name="password" validators={registerValidators.password}>
        {(field) => (
          <div className="space-y-200">
            <field.TextField
              autoComplete="new-password"
              id="auth-register-password"
              label="Heslo"
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
            label="Potvrdenie hesla"
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
              label="Súhlasím s obchodnými podmienkami"
              required
              size="sm"
            />
          )}
        </form.AppField>
      </div>

      <div className="md:col-span-2">
        <Button block isLoading={isBusy} size="sm" type="submit">
          Registrovať sa
        </Button>
      </div>
      <div className="md:col-span-2">
        <AuthFooter
          href={loginHref}
          linkText="Prihlásiť sa"
          text="Už máte účet?"
        />
      </div>
    </form>
  )
}
