"use client"

import { useForm } from "@tanstack/react-form"
import { Button } from "@techsio/ui-kit/atoms/button"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { useToast } from "@techsio/ui-kit/molecules/toast"

import { TextField } from "@/components/forms/fields/text-field"
import { useAuth } from "@/hooks/use-auth"
import { useUpdateCustomer } from "@/hooks/use-customer"
import { profileValidators } from "@/lib/form-validators"
import {
  cleanPhoneNumber,
  formatPhoneNumber,
} from "@/utils/format/format-phone-number"

interface ProfileFormData {
  first_name: string
  last_name: string
  phone: string
}

export const ProfileForm = () => {
  const { customer } = useAuth()
  const updateCustomer = useUpdateCustomer()
  const toaster = useToast()

  const defaultValues: ProfileFormData = {
    first_name: customer?.first_name ?? "",
    last_name: customer?.last_name ?? "",
    phone: formatPhoneNumber(customer?.phone ?? ""),
  }
  const form = useForm({
    defaultValues,
    onSubmit: ({ value }) => {
      const cleanedData = {
        ...value,
        phone: cleanPhoneNumber(value.phone),
      }

      updateCustomer.mutate(cleanedData, {
        onError: () => {
          toaster.create({
            description: "Nepodařilo se aktualizovat profil.",
            title: "Chyba",
            type: "error",
          })
        },
        onSuccess: () => {
          toaster.create({
            description: "Vaše údaje byly úspěšně uloženy.",
            title: "Profil aktualizován",
            type: "success",
          })
        },
      })
    },
  })

  return (
    <form
      className="space-y-200"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
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
        value={customer?.email ?? ""}
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
