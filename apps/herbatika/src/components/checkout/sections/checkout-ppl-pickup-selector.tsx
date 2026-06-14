"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useMemo, useRef, useState } from "react"
import { PplAccessPointWidget } from "../ppl-widget"
import type {
  PplAccessPoint,
  PplWidgetError,
  PplWidgetHandle,
} from "../ppl-widget.types"

type CheckoutPplPickupSelectorProps = {
  disabled: boolean
  onConfirm: (data: Record<string, unknown>) => void
}

const PPL_WIDGET_API_KEY =
  process.env.NEXT_PUBLIC_PPL_WIDGET_API_KEY?.trim() ?? ""

export function CheckoutPplPickupSelector({
  disabled,
  onConfirm,
}: CheckoutPplPickupSelectorProps) {
  const widgetRef = useRef<PplWidgetHandle | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<PplAccessPoint | null>(
    null
  )

  const widgetConfig = useMemo(
    () => ({
      accessPointCode: selectedPoint?.code ?? undefined,
      viewMode: "modal" as const,
    }),
    [selectedPoint?.code]
  )

  if (!PPL_WIDGET_API_KEY) {
    return (
      <StatusText showIcon size="sm" status="error">
        Chýba konfigurácia PPL widgetu. Doplňte NEXT_PUBLIC_PPL_WIDGET_API_KEY a
        reštartujte dev server.
      </StatusText>
    )
  }

  const handleOpenWidget = () => {
    setErrorMessage(null)
    widgetRef.current?.open()
  }

  const handleWidgetError = (error: PplWidgetError) => {
    setErrorMessage(error.message || "PPL widget sa nepodarilo načítať.")
  }

  const handleSelect = (accessPoint: PplAccessPoint) => {
    if (!accessPoint.code) {
      setErrorMessage("PPL nevrátilo kód výdajného miesta.")
      return
    }

    setSelectedPoint(accessPoint)
    setErrorMessage(null)
    onConfirm(buildPplShippingData(accessPoint))
    widgetRef.current?.close()
  }

  return (
    <div className="grid gap-150">
      {selectedPoint ? (
        <div className="grid gap-50">
          <p className="font-medium text-fg-primary text-sm">
            Výdajné miesto: {selectedPoint.name ?? selectedPoint.code}
          </p>
          <p className="text-fg-secondary text-xs">
            {formatPplAddress(selectedPoint)}
          </p>
        </div>
      ) : null}

      {errorMessage ? (
        <StatusText showIcon size="sm" status="error">
          {errorMessage}
        </StatusText>
      ) : null}

      <Button
        disabled={disabled}
        onClick={handleOpenWidget}
        size="sm"
        type="button"
        variant="primary"
      >
        {selectedPoint ? "Zmeniť výdajné miesto" : "Vybrať výdajné miesto"}
      </Button>

      <PplAccessPointWidget
        apiKey={PPL_WIDGET_API_KEY}
        config={widgetConfig}
        onError={handleWidgetError}
        onSelect={handleSelect}
        ref={widgetRef}
      />
    </div>
  )
}

function buildPplShippingData(accessPoint: PplAccessPoint) {
  const address = accessPoint.address
  const payload: Record<string, unknown> = {
    access_point_id: accessPoint.code,
    access_point_name: accessPoint.name,
    access_point_type: accessPoint.type,
    access_point_street: address?.street,
    access_point_city: address?.city,
    access_point_zip: address?.zipCode,
    access_point_country: address?.countryCode ?? address?.country,
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value != null && value !== "")
  )
}

function formatPplAddress(accessPoint: PplAccessPoint) {
  const address = accessPoint.address
  const addressParts = [
    address?.street,
    address?.zipCode,
    address?.city,
  ].filter(Boolean)

  return addressParts.length > 0 ? addressParts.join(", ") : "PPL ParcelShop"
}
