"use client"

import { useStore } from "@tanstack/react-form"
import { Button } from "@ui/atoms/button"
import { useState } from "react"
import { useCreateAddress, useUpdateAddress } from "@/hooks/use-addresses"
import { AddressValidationError } from "@/lib/errors"
import {
  useCheckoutContext,
  useCheckoutForm,
} from "../_context/checkout-context"

export function SaveAddressPanel() {
  const { customer, selectedAddressId } = useCheckoutContext()
  const form = useCheckoutForm()

  const isDirty = useStore(form.store, (state) => state.isDirty)
  const shouldShowSavePanel = Boolean(customer) && isDirty

  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { mutateAsync: createAddressAsync } = useCreateAddress()
  const { mutateAsync: updateAddressAsync } = useUpdateAddress()

  if (!shouldShowSavePanel) {
    return null
  }

  const handleSaveNew = async () => {
    const currentValues = form.getFieldValue("billingAddress")
    setSaveStatus("saving")
    setErrorMessage(null)
    try {
      await createAddressAsync(currentValues)
      // Reset with current values to clear isDirty without losing data
      form.reset({ ...form.state.values, billingAddress: currentValues })
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      if (AddressValidationError.isAddressValidationError(error)) {
        setErrorMessage(error.firstError)
      } else {
        setErrorMessage("Nepodařilo se uložit adresu")
      }
      setSaveStatus("error")
      setTimeout(() => {
        setSaveStatus("idle")
        setErrorMessage(null)
      }, 4000)
    }
  }

  const handleUpdate = async () => {
    if (!selectedAddressId) {
      return
    }
    const currentValues = form.getFieldValue("billingAddress")
    setSaveStatus("saving")
    setErrorMessage(null)
    try {
      await updateAddressAsync({
        addressId: selectedAddressId,
        ...currentValues,
      })
      // Reset with current values to clear isDirty without losing data
      form.reset({ ...form.state.values, billingAddress: currentValues })
      setSaveStatus("success")
      setTimeout(() => setSaveStatus("idle"), 2000)
    } catch (error) {
      if (AddressValidationError.isAddressValidationError(error)) {
        setErrorMessage(error.firstError)
      } else {
        setErrorMessage("Nepodařilo se aktualizovat adresu")
      }
      setSaveStatus("error")
      setTimeout(() => {
        setSaveStatus("idle")
        setErrorMessage(null)
      }, 4000)
    }
  }

  return (
    <div className="mt-400 flex flex-wrap items-center gap-300 rounded border border-info bg-info-light/20 p-300">
      <span
        className={`text-sm ${saveStatus === "error" ? "text-danger" : "text-fg-secondary"}`}
      >
        {saveStatus === "saving" && "Ukládání..."}
        {saveStatus === "success" && "✓ Uloženo"}
        {saveStatus === "idle" && "Uložit změny do profilu?"}
      </span>

      {saveStatus === "idle" && (
        <div className="flex gap-200">
          <Button onClick={handleSaveNew} size="sm">
            Uložit jako novou adresu
          </Button>
          {selectedAddressId && (
            <Button onClick={handleUpdate} size="sm">
              Aktualizovat
            </Button>
          )}
        </div>
      )}
      {saveStatus === "error" && (errorMessage || "Nepodařilo se uložit")}
    </div>
  )
}
