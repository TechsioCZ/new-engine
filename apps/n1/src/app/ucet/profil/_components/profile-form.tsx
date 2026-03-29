"use client"

import { useForm } from "@tanstack/react-form"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { Button } from "@ui/atoms/button"
import { FormInput } from "@ui/molecules/form-input"
import { TextField } from "@/components/forms/fields/text-field"
import { storefront } from "@/hooks/storefront-preset"
import { useAuth } from "@/hooks/use-auth"
import { profileValidators } from "@/lib/form-validators"
import {
  cleanPhoneNumber,
  formatPhoneNumber,
} from "@/utils/format/format-phone-number"

type ProfileFormData = {
  first_name: string
  last_name: string
  phone: string
}

export function ProfileForm() {
  const { customer } = useAuth()
  const updateCustomer = storefront.hooks.customers.useUpdateCustomer()
  const toaster = useToast()

  const defaultValues: ProfileFormData = {
    first_name: customer?.first_name || "",
    last_name: customer?.last_name || "",
    phone: formatPhoneNumber(customer?.phone || ""),
  }
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      const cleanedData = {
        ...value,
        phone: cleanPhoneNumber(value.phone),
      }

      updateCustomer.mutate(cleanedData, {
        onSuccess: () => {
          toaster.create({
            title: "Profil aktualizován",
            description: "Vaše údaje byly úspěšně uloženy.",
            type: "success",
          })
        },
        onError: () => {
          toaster.create({
            title: "Chyba",
            description: "Nepodařilo se aktualizovat profil.",
            type: "error",
          })
        },
      })
    },
  })

  return (
    <form
      className="space-y-200"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <div className="grid gap-200 md:grid-cols-2">
        <form.Field name="first_name" validators={profileValidators.first_name}>
          {(field) => (
            <TextField
              disabled={updateCustomer.isPending}
              field={field}
              label="Jméno"
              placeholder="Jan"
            />
          )}
        </form.Field>

        <form.Field name="last_name" validators={profileValidators.last_name}>
          {(field) => (
            <TextField
              disabled={updateCustomer.isPending}
              field={field}
              label="Příjmení"
              placeholder="Novák"
            />
          )}
        </form.Field>
      </div>

      <form.Field name="phone" validators={profileValidators.phone}>
        {(field) => (
          <TextField
            disabled={updateCustomer.isPending}
            field={field}
            label="Telefon"
            maxLength={17}
            placeholder="+420 123 456 789"
            transform={formatPhoneNumber}
            type="tel"
          />
        )}
      </form.Field>

      <FormInput
        disabled={updateCustomer.isPending}
        id="email"
        label="E-mail (nelze změnit)"
        readOnly
        value={customer?.email || ""}
      />

      <Button
        className="w-full md:w-auto"
        disabled={updateCustomer.isPending}
        type="submit"
      >
        {updateCustomer.isPending ? "Ukládám..." : "Uložit změny"}
      </Button>
    </form>
  )
}
