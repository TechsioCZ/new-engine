"use client"

import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { useTranslations } from "next-intl"
import type { RegisterFormValidators } from "@/lib/auth/auth-form-validators"
import type {
  RegisterFieldChangeHandler,
  RegisterFormController,
} from "./register-form.types"

type RegisterWholesaleFieldsProps = {
  countryItems: SelectItem[]
  form: RegisterFormController
  onValueChange?: RegisterFieldChangeHandler
  validators: RegisterFormValidators
}

export function RegisterWholesaleFields({
  countryItems,
  form,
  onValueChange,
  validators,
}: RegisterWholesaleFieldsProps) {
  const tAuth = useTranslations("auth")
  const tForm = useTranslations("form")

  return (
    <fieldset className="col-span-2 grid gap-250 rounded-sm md:grid-cols-2">
      <legend className="sr-only">{tAuth("register.company_fields")}</legend>
      <div className="md:col-span-2">
        <form.AppField name="company_name" validators={validators.company_name}>
          {(field) => (
            <field.TextField
              autoComplete="organization"
              id="auth-register-company-name"
              label={tForm("company_name")}
              onValueChange={onValueChange}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>

      <form.AppField
        name="company_identifier"
        validators={validators.company_identifier}
      >
        {(field) => (
          <field.TextField
            autoComplete="off"
            id="auth-register-company-identifier"
            label={tForm("company_id")}
            onValueChange={onValueChange}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <form.AppField
        name="billing_country_code"
        validators={validators.billing_country_code}
      >
        {(field) => (
          <field.SelectField
            id="auth-register-billing-country"
            items={countryItems}
            label={tForm("country")}
            onValueChange={onValueChange}
            placeholder={tForm("country_placeholder")}
            readOnly
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="md:col-span-2">
        <form.AppField
          name="billing_address_1"
          validators={validators.billing_address_1}
        >
          {(field) => (
            <field.TextField
              autoComplete="billing street-address"
              id="auth-register-billing-address-1"
              label={tForm("address")}
              onValueChange={onValueChange}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>

      <div className="md:col-span-2">
        <form.AppField name="billing_address_2">
          {(field) => (
            <field.TextField
              autoComplete="billing address-line2"
              id="auth-register-billing-address-2"
              label={tForm("address_line_2")}
              onValueChange={onValueChange}
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>

      <form.AppField
        name="billing_city"
        validators={validators.billing_city}
      >
        {(field) => (
          <field.TextField
            autoComplete="billing address-level2"
            id="auth-register-billing-city"
            label={tForm("city")}
            onValueChange={onValueChange}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <form.AppField
        name="billing_postal_code"
        validators={validators.billing_postal_code}
      >
        {(field) => (
          <field.TextField
            autoComplete="billing postal-code"
            id="auth-register-billing-postal-code"
            label={tForm("postal_code")}
            onValueChange={onValueChange}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>
    </fieldset>
  )
}
