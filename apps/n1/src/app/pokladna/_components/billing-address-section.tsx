"use client"

import { SelectField } from "@/components/forms/fields/select-field"
import { TextField } from "@/components/forms/fields/text-field"
import { COUNTRY_OPTIONS } from "@/lib/constants"
import { addressValidators, emailValidator } from "@/lib/form-validators"
import type { AddressFormData } from "@/utils/address-validation"
import { formatPhoneNumber } from "@/utils/format/format-phone-number"
import { formatPostalCode } from "@/utils/format/format-postal-code"

import {
  useCheckoutContext,
  useCheckoutForm,
} from "../_context/checkout-context"
import { AddressPicker } from "./address-picker"
import { SaveAddressPanel } from "./save-address-panel"

export function BillingAddressSection() {
  const { customer, selectedAddressId, setSelectedAddressId, isCompleting } =
    useCheckoutContext()
  const form = useCheckoutForm()

  const addresses = customer?.addresses || []

  const handleAddressSelect = (address: AddressFormData, id: string) => {
    form.setFieldValue("billingAddress", address)
    setSelectedAddressId(id)
  }

  return (
    <section className="rounded border border-border-secondary bg-surface/70 p-400">
      <div className="mb-400 space-y-300">
        <h2 className="font-semibold text-fg-primary text-lg">
          Fakturační adresa
        </h2>

        {addresses.length > 0 && (
          <AddressPicker
            addresses={addresses}
            disabled={isCompleting}
            onSelect={handleAddressSelect}
            selectedId={selectedAddressId}
          />
        )}
      </div>

      <div className="flex flex-col gap-400">
        <div className="grid grid-cols-2 gap-300">
          <form.Field
            name="billingAddress.first_name"
            validators={addressValidators.first_name}
          >
            {(field) => (
              <TextField
                disabled={isCompleting}
                field={field}
                label="Jméno"
                required
              />
            )}
          </form.Field>
          <form.Field
            name="billingAddress.last_name"
            validators={addressValidators.last_name}
          >
            {(field) => (
              <TextField
                disabled={isCompleting}
                field={field}
                label="Příjmení"
                required
              />
            )}
          </form.Field>
        </div>

        <form.Field name="billingAddress.company">
          {(field) => (
            <TextField
              disabled={isCompleting}
              field={field}
              label="Firma (volitelné)"
            />
          )}
        </form.Field>

        <form.Field
          name="billingAddress.address_1"
          validators={addressValidators.address_1}
        >
          {(field) => (
            <TextField
              disabled={isCompleting}
              field={field}
              label="Adresa"
              placeholder="Ulice a číslo popisné"
              required
            />
          )}
        </form.Field>

        <form.Field name="billingAddress.address_2">
          {(field) => (
            <TextField
              disabled={isCompleting}
              field={field}
              label="Byt, apartmá atd. (volitelné)"
            />
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-300">
          <form.Field
            name="billingAddress.city"
            validators={addressValidators.city}
          >
            {(field) => (
              <TextField
                disabled={isCompleting}
                field={field}
                label="Město"
                required
              />
            )}
          </form.Field>
          <form.Field
            name="billingAddress.country_code"
            validators={addressValidators.country_code}
          >
            {(field) => (
              <SelectField
                disabled={isCompleting}
                field={field}
                label="Země"
                options={COUNTRY_OPTIONS}
              />
            )}
          </form.Field>
        </div>

        <div className="grid grid-cols-2 gap-300">
          <form.Field name="billingAddress.province">
            {(field) => (
              <TextField
                disabled={isCompleting}
                field={field}
                label="Kraj (volitelné)"
              />
            )}
          </form.Field>
          <form.Field
            name="billingAddress.postal_code"
            validators={addressValidators.postal_code}
          >
            {(field) => (
              <TextField
                disabled={isCompleting}
                field={field}
                label="PSČ"
                placeholder="110 00"
                required
                transform={formatPostalCode}
              />
            )}
          </form.Field>
        </div>

        <form.Field
          name="billingAddress.phone"
          validators={addressValidators.phone}
        >
          {(field) => (
            <TextField
              disabled={isCompleting}
              field={field}
              label="Telefon (volitelné)"
              maxLength={11}
              placeholder="600 400 200"
              transform={formatPhoneNumber}
              type="tel"
            />
          )}
        </form.Field>

        {!customer && (
          <form.Field name="email" validators={emailValidator}>
            {(field) => (
              <TextField
                disabled={isCompleting}
                field={field}
                label="Email"
                placeholder="vas@email.cz"
                required
                type="email"
              />
            )}
          </form.Field>
        )}
      </div>

      <SaveAddressPanel />

      {!customer && (
        <p className="mt-400 text-fg-tertiary text-sm">
          Přihlaste se pro uložení adresy do svého účtu
        </p>
      )}
    </section>
  )
}
