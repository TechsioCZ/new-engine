"use client"

import { useForm } from "@tanstack/react-form"

import { SelectField } from "@/components/forms/fields/select-field"
import { TextField } from "@/components/forms/fields/text-field"
import { COUNTRY_OPTIONS } from "@/lib/constants"
import { addressValidators } from "@/lib/form-validators"
import type { AddressFormData } from "@/utils/address-validation"
import { formatPhoneNumber } from "@/utils/format/format-phone-number"
import { formatPostalCode } from "@/utils/format/format-postal-code"

const _formTypeHelper = (d: AddressFormData) => useForm({ defaultValues: d })

type AddressForm = ReturnType<typeof _formTypeHelper>

type AddressFormFieldsProps = {
  form: AddressForm
  disabled?: boolean
}

export function AddressFormFields({ form, disabled }: AddressFormFieldsProps) {
  return (
    <div className="flex flex-col gap-400">
      <div className="grid grid-cols-2 gap-300">
        <form.Field name="first_name" validators={addressValidators.first_name}>
          {(field) => (
            <TextField
              disabled={disabled}
              field={field}
              label="Jméno"
              required
            />
          )}
        </form.Field>
        <form.Field name="last_name" validators={addressValidators.last_name}>
          {(field) => (
            <TextField
              disabled={disabled}
              field={field}
              label="Příjmení"
              required
            />
          )}
        </form.Field>
      </div>

      <form.Field name="company">
        {(field) => (
          <TextField
            disabled={disabled}
            field={field}
            label="Firma (volitelné)"
          />
        )}
      </form.Field>

      <form.Field name="address_1" validators={addressValidators.address_1}>
        {(field) => (
          <TextField
            disabled={disabled}
            field={field}
            label="Adresa"
            placeholder="Ulice a číslo popisné"
            required
          />
        )}
      </form.Field>

      <form.Field name="address_2">
        {(field) => (
          <TextField
            disabled={disabled}
            field={field}
            label="Byt, apartmá atd. (volitelné)"
          />
        )}
      </form.Field>

      <div className="grid grid-cols-2 gap-300">
        <form.Field name="city" validators={addressValidators.city}>
          {(field) => (
            <TextField
              disabled={disabled}
              field={field}
              label="Město"
              required
            />
          )}
        </form.Field>
        <form.Field
          name="country_code"
          validators={addressValidators.country_code}
        >
          {(field) => (
            <SelectField
              disabled={disabled}
              field={field}
              label="Země"
              options={COUNTRY_OPTIONS}
            />
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-2 gap-300">
        <form.Field name="province">
          {(field) => (
            <TextField
              disabled={disabled}
              field={field}
              label="Kraj (volitelné)"
            />
          )}
        </form.Field>
        <form.Field
          name="postal_code"
          validators={addressValidators.postal_code}
        >
          {(field) => (
            <TextField
              disabled={disabled}
              field={field}
              label="PSČ"
              placeholder="110 00"
              required
              transform={formatPostalCode}
            />
          )}
        </form.Field>
      </div>

      <form.Field name="phone" validators={addressValidators.phone}>
        {(field) => (
          <TextField
            disabled={disabled}
            field={field}
            label="Telefon (volitelné)"
            placeholder="+420 123 456 789"
            transform={formatPhoneNumber}
            type="tel"
          />
        )}
      </form.Field>
    </div>
  )
}
