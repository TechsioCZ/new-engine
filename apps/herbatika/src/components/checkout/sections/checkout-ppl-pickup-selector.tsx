"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useMemo, useRef, useState } from "react"
import {
  CARRIER_PICKUP_FAILURE_KEYS,
  type CarrierPickupFailureReason,
  resolveCarrierPickupWidgetLanguage,
} from "@/components/checkout/carrier-pickup.utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
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
  const tCheckout = useTranslations("checkout")
  const marketContext = useMarketContext()
  const widgetRef = useRef<PplWidgetHandle | null>(null)
  const [failureReason, setFailureReason] =
    useState<CarrierPickupFailureReason | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<PplAccessPoint | null>(
    null
  )
  const fallbackPointLabel = tCheckout("pickup_point_fallback")

  const widgetConfig = useMemo(
    () => ({
      accessPointCode: selectedPoint?.code ?? undefined,
      allowedCountries: [marketContext.countryCode.toUpperCase()],
      countriesMenuDisabled: true,
      defaultCountry: marketContext.countryCode.toUpperCase(),
      defaultLang: resolveCarrierPickupWidgetLanguage(marketContext.locale),
      viewMode: "modal" as const,
    }),
    [
      marketContext.countryCode,
      marketContext.locale,
      selectedPoint?.code,
    ]
  )

  if (!PPL_WIDGET_API_KEY) {
    return (
      <StatusText showIcon size="sm" status="error">
        {tCheckout("pickup_selector_unavailable")}
      </StatusText>
    )
  }

  const handleOpenWidget = () => {
    setFailureReason(null)
    widgetRef.current?.open()
  }

  const handleWidgetError = (error: PplWidgetError) => {
    console.error("PPL pickup widget failed", error)
    setFailureReason("selector_unavailable")
  }

  const handleSelect = (accessPoint: PplAccessPoint) => {
    if (!accessPoint.code) {
      console.error("PPL pickup point selection is missing a code")
      setFailureReason("selection_failed")
      return
    }

    setSelectedPoint(accessPoint)
    setFailureReason(null)
    onConfirm(buildPplShippingData(accessPoint, fallbackPointLabel))
    widgetRef.current?.close()
  }

  const selectedPointAddress = selectedPoint
    ? formatPplAddress(selectedPoint)
    : null

  return (
    <div className="grid gap-150">
      {selectedPoint ? (
        <div className="grid gap-50">
          <p className="font-medium text-fg-primary text-sm">
            {tCheckout("selected_pickup_point", {
              pickupPointName:
                selectedPoint.name ?? selectedPoint.code ?? fallbackPointLabel,
            })}
          </p>
          {selectedPointAddress ? (
            <p className="text-fg-secondary text-xs">
              {selectedPointAddress}
            </p>
          ) : null}
        </div>
      ) : null}

      {failureReason ? (
        <StatusText showIcon size="sm" status="error">
          {tCheckout(CARRIER_PICKUP_FAILURE_KEYS[failureReason])}
        </StatusText>
      ) : null}

      <Button
        disabled={disabled}
        onClick={handleOpenWidget}
        size="sm"
        type="button"
        variant="primary"
      >
        {selectedPoint
          ? tCheckout("change_pickup_point")
          : tCheckout("select_pickup_point")}
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

function buildPplShippingData(
  accessPoint: PplAccessPoint,
  fallbackPointLabel: string
) {
  const address = accessPoint.address
  const payload: Record<string, unknown> = {
    access_point_id: accessPoint.code,
    access_point_name:
      accessPoint.name ?? accessPoint.code ?? fallbackPointLabel,
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

  return addressParts.length > 0 ? addressParts.join(", ") : null
}
