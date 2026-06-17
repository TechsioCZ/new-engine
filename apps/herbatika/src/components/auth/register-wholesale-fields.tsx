"use client"

import type { SelectItem } from "@techsio/ui-kit/molecules/select"
import { registerValidators } from "@/lib/auth/auth-form-validators"
import type {
  RegisterFieldChangeHandler,
  RegisterFormController,
} from "./register-form.types"

type RegisterWholesaleFieldsProps = {
  countryItems: SelectItem[]
  form: RegisterFormController
  onValueChange?: RegisterFieldChangeHandler
}

export function RegisterWholesaleFields({
  countryItems,
  form,
  onValueChange,
}: RegisterWholesaleFieldsProps) {
  return (
    <fieldset className="col-span-2 grid gap-250 rounded-sm md:grid-cols-2">
      <legend className="sr-only">Firemné údaje</legend>
      <div className="md:col-span-2">
        <form.AppField
          name="company_name"
          validators={registerValidators.company_name}
        >
          {(field) => (
            <field.TextField
              autoComplete="organization"
              id="auth-register-company-name"
              label="Názov firmy"
              onValueChange={onValueChange}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>

      <form.AppField
        name="company_identifier"
        validators={registerValidators.company_identifier}
      >
        {(field) => (
          <field.TextField
            autoComplete="off"
            id="auth-register-company-identifier"
            label="IČO / firemný identifikátor"
            onValueChange={onValueChange}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <form.AppField
        name="billing_country_code"
        validators={registerValidators.billing_country_code}
      >
        {(field) => (
          <field.SelectField
            id="auth-register-billing-country"
            items={countryItems}
            label="Krajina"
            onValueChange={onValueChange}
            placeholder="Vyberte krajinu"
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="md:col-span-2">
        <form.AppField
          name="billing_address_1"
          validators={registerValidators.billing_address_1}
        >
          {(field) => (
            <field.TextField
              autoComplete="billing street-address"
              id="auth-register-billing-address-1"
              label="Ulica a číslo domu"
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
              label="Doplnenie adresy"
              onValueChange={onValueChange}
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>

      <form.AppField
        name="billing_city"
        validators={registerValidators.billing_city}
      >
        {(field) => (
          <field.TextField
            autoComplete="billing address-level2"
            id="auth-register-billing-city"
            label="Mesto"
            onValueChange={onValueChange}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <form.AppField
        name="billing_postal_code"
        validators={registerValidators.billing_postal_code}
      >
        {(field) => (
          <field.TextField
            autoComplete="billing postal-code"
            id="auth-register-billing-postal-code"
            label="PSČ"
            onValueChange={onValueChange}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>
    </fieldset>
  )
}
