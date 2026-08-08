"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useRef, useState } from "react"

import {
  CARRIER_PICKUP_FAILURE_KEYS,
  resolveCarrierPickupWidgetLanguage,
} from "@/components/checkout/carrier-pickup.utils"
import type { CarrierPickupFailureReason } from "@/components/checkout/carrier-pickup.utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

import { PacketaPickupWidget } from "../packeta-widget"
import type {
  PacketaPickupPoint,
  PacketaWidgetError,
  PacketaWidgetHandle,
  PacketaWidgetOptions,
} from "../packeta-widget.types"
import {
  buildPacketaShippingData,
  ENABLED_PACKETA_COUNTRIES,
  formatPacketaAddress,
  PACKETA_WIDGET_API_KEY,
  resolvePacketaPointLabel,
} from "./checkout-packeta-pickup.utils"

interface CheckoutPacketaPickupSelectorProps {
  disabled: boolean
  onConfirm: (data: Record<string, unknown>) => void
}

export const CheckoutPacketaPickupSelector = ({
  disabled,
  onConfirm,
}: CheckoutPacketaPickupSelectorProps) => {
  const tCheckout = useTranslations("checkout")
  const marketContext = useMarketContext()
  const widgetRef = useRef<PacketaWidgetHandle | null>(null)
  const [failureReason, setFailureReason] =
    useState<CarrierPickupFailureReason | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<PacketaPickupPoint | null>(
    null,
  )
  const isMarketEnabled = ENABLED_PACKETA_COUNTRIES.includes(
    marketContext.countryCode,
  )
  const fallbackPointLabel = tCheckout("pickup_point_fallback")

  const country = marketContext.countryCode
  const widgetOptions: PacketaWidgetOptions = {
    appIdentity: "herbatika-next-checkout",
    country,
    language: resolveCarrierPickupWidgetLanguage(marketContext.locale),
    vendors: [
      { country, group: "", selected: true },
      { country, group: "zbox" },
    ],
    ...(typeof window === "undefined"
      ? {}
      : { webUrl: window.location.origin }),
  }

  if (!(PACKETA_WIDGET_API_KEY && isMarketEnabled)) {
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

  const handleWidgetError = (error: PacketaWidgetError) => {
    console.error("Packeta pickup widget failed", error)
    setFailureReason("selector_unavailable")
  }

  const handleSelect = (point: PacketaPickupPoint) => {
    if (point.id === undefined || point.id === null || point.id.length === 0) {
      console.error("Packeta pickup point selection is missing an ID")
      setFailureReason("selection_failed")
      return
    }

    if (
      point.error !== undefined &&
      point.error !== null &&
      point.error.length > 0
    ) {
      console.warn("Packeta pickup point is unavailable", {
        code: point.error,
        pointId: point.id,
      })
      setFailureReason("point_unavailable")
      return
    }

    setSelectedPoint(point)
    setFailureReason(null)
    onConfirm(buildPacketaShippingData(point, fallbackPointLabel))
  }

  const selectedPointAddress = selectedPoint
    ? formatPacketaAddress(selectedPoint)
    : null

  return (
    <div className="grid gap-150">
      {selectedPoint ? (
        <div className="grid gap-50">
          <p className="font-medium text-fg-primary text-sm">
            {tCheckout("selected_pickup_point", {
              pickupPointName: resolvePacketaPointLabel(
                selectedPoint,
                fallbackPointLabel,
              ),
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

      <PacketaPickupWidget
        apiKey={PACKETA_WIDGET_API_KEY}
        onError={handleWidgetError}
        onSelect={handleSelect}
        options={widgetOptions}
        ref={widgetRef}
      />
    </div>
  )
}
