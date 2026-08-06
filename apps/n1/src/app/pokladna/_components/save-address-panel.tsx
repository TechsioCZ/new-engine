"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { useState, useSyncExternalStore } from "react"

import { useCreateAddress, useUpdateAddress } from "@/hooks/use-addresses"
import { AddressValidationError } from "@/lib/errors"

import {
  useCheckoutContext,
  useCheckoutForm,
} from "../_context/checkout-context"

enum SaveStatus {
  Error = "error",
  Idle = "idle",
  Saving = "saving",
  Success = "success",
}

export const SaveAddressPanel = () => {
  const { customer, selectedAddressId } = useCheckoutContext()
  const form = useCheckoutForm()

  const isDirty = useSyncExternalStore(
    (onStoreChange) => {
      const subscription = form.store.subscribe(onStoreChange)
      return () => {
        subscription.unsubscribe()
      }
    },
    () => form.store.state.isDirty,
    () => form.store.state.isDirty,
  )
  const shouldShowSavePanel = Boolean(customer) && isDirty

  const [saveStatus, setSaveStatus] = useState(SaveStatus.Idle)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { mutateAsync: createAddressAsync } = useCreateAddress()
  const { mutateAsync: updateAddressAsync } = useUpdateAddress()

  if (!shouldShowSavePanel) {
    return null
  }

  const handleSaveNew = async () => {
    const currentValues = form.getFieldValue("billingAddress")
    setSaveStatus(SaveStatus.Saving)
    setErrorMessage(null)
    try {
      await createAddressAsync(currentValues)
      // Reset with current values to clear isDirty without losing data
      form.reset({ ...form.state.values, billingAddress: currentValues })
      setSaveStatus(SaveStatus.Success)
      setTimeout(() => {
        setSaveStatus(SaveStatus.Idle)
      }, 2000)
    } catch (error) {
      if (AddressValidationError.isAddressValidationError(error)) {
        setErrorMessage(error.firstError)
      } else {
        setErrorMessage("Nepodařilo se uložit adresu")
      }
      setSaveStatus(SaveStatus.Error)
      setTimeout(() => {
        setSaveStatus(SaveStatus.Idle)
        setErrorMessage(null)
      }, 4000)
    }
  }

  const handleUpdate = async () => {
    if (
      typeof selectedAddressId !== "string" ||
      selectedAddressId.length === 0
    ) {
      return
    }
    const currentValues = form.getFieldValue("billingAddress")
    setSaveStatus(SaveStatus.Saving)
    setErrorMessage(null)
    try {
      await updateAddressAsync({
        addressId: selectedAddressId,
        data: currentValues,
      })
      // Reset with current values to clear isDirty without losing data
      form.reset({ ...form.state.values, billingAddress: currentValues })
      setSaveStatus(SaveStatus.Success)
      setTimeout(() => {
        setSaveStatus(SaveStatus.Idle)
      }, 2000)
    } catch (error) {
      if (AddressValidationError.isAddressValidationError(error)) {
        setErrorMessage(error.firstError)
      } else {
        setErrorMessage("Nepodařilo se aktualizovat adresu")
      }
      setSaveStatus(SaveStatus.Error)
      setTimeout(() => {
        setSaveStatus(SaveStatus.Idle)
        setErrorMessage(null)
      }, 4000)
    }
  }

  return (
    <div className="mt-400 flex flex-wrap items-center gap-300 rounded border border-info bg-info-light/20 p-300">
      <span
        className={`text-sm ${saveStatus === SaveStatus.Error ? "text-danger" : "text-fg-secondary"}`}
      >
        {saveStatus === SaveStatus.Saving && "Ukládání..."}
        {saveStatus === SaveStatus.Success && "✓ Uloženo"}
        {saveStatus === SaveStatus.Idle && "Uložit změny do profilu?"}
      </span>

      {saveStatus === SaveStatus.Idle && (
        <div className="flex gap-200">
          <Button
            onClick={() => {
              void handleSaveNew()
            }}
            size="sm"
          >
            Uložit jako novou adresu
          </Button>
          {(selectedAddressId?.length ?? 0) > 0 && (
            <Button
              onClick={() => {
                void handleUpdate()
              }}
              size="sm"
            >
              Aktualizovat
            </Button>
          )}
        </div>
      )}
      {saveStatus === SaveStatus.Error &&
        (errorMessage ?? "Nepodařilo se uložit")}
    </div>
  )
}
