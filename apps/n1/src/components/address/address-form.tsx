"use client"

import type { HttpTypes } from "@medusajs/types"
import { useForm } from "@tanstack/react-form"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { Button } from "@ui/atoms/button"
import { useCreateAddress, useUpdateAddress } from "@/hooks/use-addresses"
import { AddressValidationError } from "@/lib/errors"
import { addressToFormData, DEFAULT_ADDRESS } from "@/utils/address-helpers"
import type { AddressFormData } from "@/utils/address-validation"
import { AddressFormFields } from "./address-form-fields"

type AddressFormProps = {
  address?: HttpTypes.StoreCustomerAddress
  onCancel: () => void
  onSuccess: () => void
}

export function AddressForm({
  address,
  onCancel,
  onSuccess,
}: AddressFormProps) {
  const createAddress = useCreateAddress()
  const updateAddress = useUpdateAddress()
  const toaster = useToast()

  const isEditingExistingAddress = Boolean(address)
  const isPending = createAddress.isPending || updateAddress.isPending
  let submitLabel = "Přidat"
  if (isPending) {
    submitLabel = "Ukládám..."
  } else if (isEditingExistingAddress) {
    submitLabel = "Uložit"
  }

  const defaultValues: AddressFormData = {
    ...DEFAULT_ADDRESS,
    ...addressToFormData(address),
  }
  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      try {
        if (address) {
          await updateAddress.mutateAsync({
            addressId: address.id,
            data: value,
          })
          toaster.create({ title: "Adresa upravena", type: "success" })
        } else {
          await createAddress.mutateAsync(value)
          toaster.create({ title: "Adresa přidána", type: "success" })
        }
        onSuccess()
      } catch (error) {
        if (AddressValidationError.isAddressValidationError(error)) {
          toaster.create({
            title: error.firstError,
            type: "error",
          })
        } else {
          toaster.create({
            title: isEditingExistingAddress
              ? "Chyba při úpravě"
              : "Chyba při přidání",
            type: "error",
          })
        }
      }
    },
  })

  return (
    <form
      className="space-y-400"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <AddressFormFields disabled={isPending} form={form} />

      <div className="flex justify-end gap-200 pt-200">
        <Button
          disabled={isPending}
          onClick={onCancel}
          size="sm"
          theme="borderless"
          type="button"
          variant="secondary"
        >
          Zrušit
        </Button>
        <Button disabled={isPending} size="sm" type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
