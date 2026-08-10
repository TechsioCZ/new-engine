"use client"

import { omitUndefined } from "@techsio/std/object"
import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"

import {
  CARRIER_PICKUP_FAILURE_KEYS,
  resolveCarrierPickupWidgetLanguage,
} from "@/components/checkout/carrier-pickup.utils"
import type {
  CarrierPickupData,
  CarrierPickupFailureReason,
} from "@/components/checkout/carrier-pickup.utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

import { PplAccessPointWidget } from "../ppl-widget"
import type {
  PplAccessPoint,
  PplWidgetError,
  PplWidgetHandle,
  PplWidgetConfig,
} from "../ppl-widget.types"

const excludeEmptyPickupText = (value: string | null | undefined) =>
  value === null || value === "" ? undefined : value

const buildPplShippingData = (
  accessPoint: PplAccessPoint,
  fallbackPointLabel: string,
): CarrierPickupData => {
  const { address } = accessPoint

  return omitUndefined({
    access_point_city: excludeEmptyPickupText(address?.city),
    access_point_country: excludeEmptyPickupText(
      address?.countryCode ?? address?.country,
    ),
    access_point_id: excludeEmptyPickupText(accessPoint.code),
    access_point_name: excludeEmptyPickupText(
      accessPoint.name ?? accessPoint.code ?? fallbackPointLabel,
    ),
    access_point_street: excludeEmptyPickupText(address?.street),
    access_point_type: excludeEmptyPickupText(accessPoint.type),
    access_point_zip: excludeEmptyPickupText(address?.zipCode),
  })
}

const formatPplAddress = (accessPoint: PplAccessPoint) => {
  const { address } = accessPoint
  const addressParts = [
    address?.street,
    address?.zipCode,
    address?.city,
  ].filter(Boolean)

  return addressParts.length > 0 ? addressParts.join(", ") : null
}

interface CheckoutPplPickupSelectorProps {
  disabled: boolean
  onConfirm: (data: CarrierPickupData) => void
}

const { NEXT_PUBLIC_PPL_WIDGET_API_KEY } = process.env
const PPL_WIDGET_API_KEY = NEXT_PUBLIC_PPL_WIDGET_API_KEY?.trim() ?? ""

export const CheckoutPplPickupSelector = ({
  disabled,
  onConfirm,
}: CheckoutPplPickupSelectorProps) => {
  const tCheckout = useTranslations("checkout")
  const marketContext = useMarketContext()
  const widgetRef = useRef<PplWidgetHandle | null>(null)
  const [failureReason, setFailureReason] =
    useState<CarrierPickupFailureReason | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<PplAccessPoint | null>(
    null,
  )
  const fallbackPointLabel = tCheckout("pickup_point_fallback")

  const widgetConfig: PplWidgetConfig = {
    ...(selectedPoint?.code === undefined || selectedPoint.code === null
      ? {}
      : { accessPointCode: selectedPoint.code }),
    allowedCountries: [marketContext.countryCode.toUpperCase()],
    countriesMenuDisabled: true,
    defaultCountry: marketContext.countryCode.toUpperCase(),
    defaultLang: resolveCarrierPickupWidgetLanguage(marketContext.locale),
    viewMode: "modal",
  }

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
    if (
      accessPoint.code === undefined ||
      accessPoint.code === null ||
      accessPoint.code.length === 0
    ) {
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
          {selectedPointAddress === null ? null : (
            <p className="text-fg-secondary text-xs">{selectedPointAddress}</p>
          )}
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
