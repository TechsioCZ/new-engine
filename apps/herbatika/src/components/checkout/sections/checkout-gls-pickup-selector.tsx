"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { useState } from "react"
import type { ChangeEvent } from "react"

import type { CarrierPickupData } from "@/components/checkout/carrier-pickup.utils"

interface CheckoutGlsPickupSelectorProps {
  disabled: boolean
  onConfirm: (data: CarrierPickupData) => void
}

export const CheckoutGlsPickupSelector = ({
  disabled,
  onConfirm,
}: CheckoutGlsPickupSelectorProps) => {
  const [accessPointId, setAccessPointId] = useState("")
  const [accessPointName, setAccessPointName] = useState("")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConfirm = () => {
    const normalizedId = accessPointId.trim()
    if (!normalizedId) {
      setErrorMessage("Zadajte ID GLS výdajného miesta.")
      return
    }

    const normalizedName = accessPointName.trim()

    setErrorMessage(null)
    onConfirm({
      access_point_id: normalizedId,
      access_point_name:
        normalizedName.length > 0 ? normalizedName : `GLS ${normalizedId}`,
    })
  }

  return (
    <div className="grid gap-150">
      <StatusText showIcon size="sm" status="warning">
        GLS výber výdajného miesta je pripravený na ručné zadanie ID. Widget
        alebo mapa sa dá dopojiť podľa produkčného GLS účtu.
      </StatusText>

      <FormInput
        aria-describedby={
          errorMessage !== null && errorMessage.length > 0
            ? "checkout-gls-access-point-error"
            : undefined
        }
        aria-invalid={Boolean(errorMessage)}
        disabled={disabled}
        helpText="ID ParcelShopu z GLS systému alebo mapy."
        id="checkout-gls-access-point-id"
        label="GLS výdajné miesto"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setAccessPointId(event.target.value)
        }}
        placeholder="napr. SK12345"
        size="sm"
        value={accessPointId}
      />

      <FormInput
        disabled={disabled}
        helpText="Voliteľné pomenovanie výdajného miesta pre adresu doručenia."
        id="checkout-gls-access-point-name"
        label="Názov výdajného miesta"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setAccessPointName(event.target.value)
        }}
        placeholder="GLS ParcelShop"
        size="sm"
        value={accessPointName}
      />

      {errorMessage !== null && errorMessage.length > 0 ? (
        <StatusText
          id="checkout-gls-access-point-error"
          showIcon
          size="sm"
          status="error"
        >
          {errorMessage}
        </StatusText>
      ) : null}

      <Button
        disabled={disabled}
        onClick={handleConfirm}
        size="sm"
        type="button"
        variant="primary"
      >
        Potvrdiť GLS výdajné miesto
      </Button>
    </div>
  )
}
