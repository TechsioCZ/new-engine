"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useQuery } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { useMemo, useRef, useState } from "react"
import {
  CARRIER_PICKUP_FAILURE_KEYS,
  type CarrierPickupFailureReason,
  resolveCarrierPickupWidgetLanguage,
} from "@/components/checkout/carrier-pickup.utils"
import { useMarketContext } from "@/lib/storefront/market-context-provider"
import { storefrontSdk } from "@/lib/storefront/sdk"
import { PacketaPickupWidget } from "../packeta-widget"
import type {
  PacketaPickupPoint,
  PacketaWidgetError,
  PacketaWidgetHandle,
  PacketaWidgetOptions,
} from "../packeta-widget.types"

type CheckoutPacketaPickupSelectorProps = {
  disabled: boolean
  onConfirm: (data: Record<string, unknown>) => void
}

type PacketaWidgetConfigResponse = {
  enabled: boolean
  api_key: string | null
  countries: string[]
}

export function CheckoutPacketaPickupSelector({
  disabled,
  onConfirm,
}: CheckoutPacketaPickupSelectorProps) {
  const tCheckout = useTranslations("checkout")
  const marketContext = useMarketContext()
  const widgetRef = useRef<PacketaWidgetHandle | null>(null)
  const [failureReason, setFailureReason] =
    useState<CarrierPickupFailureReason | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<PacketaPickupPoint | null>(
    null
  )
  const { data: widgetConfig, isPending: isWidgetConfigPending } = useQuery({
    queryFn: () =>
      storefrontSdk.client.fetch<PacketaWidgetConfigResponse>(
        "/store/packeta/widget-config"
      ),
    queryKey: ["packeta-widget-config"],
    retry: false,
    staleTime: 30 * 1000,
  })
  const widgetApiKey = widgetConfig?.api_key?.trim() ?? ""
  const isMarketEnabled =
    widgetConfig?.enabled === true &&
    widgetConfig.countries.includes(marketContext.countryCode)
  const fallbackPointLabel = tCheckout("pickup_point_fallback")

  const widgetOptions = useMemo<PacketaWidgetOptions>(() => {
    const country = marketContext.countryCode

    return {
      appIdentity: "herbatika-next-checkout",
      country,
      language: resolveCarrierPickupWidgetLanguage(marketContext.locale),
      vendors: [
        { country, group: "", selected: true },
        { country, group: "zbox" },
      ],
      webUrl:
        typeof window === "undefined" ? undefined : window.location.origin,
    }
  }, [marketContext.countryCode, marketContext.locale])

  if (isWidgetConfigPending) {
    return null
  }

  if (!(widgetApiKey && isMarketEnabled)) {
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
    if (!point.id) {
      console.error("Packeta pickup point selection is missing an ID")
      setFailureReason("selection_failed")
      return
    }

    if (point.error) {
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
                fallbackPointLabel
              ),
            })}
          </p>
          {selectedPointAddress ? (
            <p className="text-fg-secondary text-xs">{selectedPointAddress}</p>
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

      <PacketaPickupWidget
        apiKey={widgetApiKey}
        onError={handleWidgetError}
        onSelect={handleSelect}
        options={widgetOptions}
        ref={widgetRef}
      />
    </div>
  )
}

function buildPacketaShippingData(
  point: PacketaPickupPoint,
  fallbackPointLabel: string
) {
  const payload: Record<string, unknown> = {
    access_point_id: point.id,
    access_point_name: resolvePacketaPointLabel(point, fallbackPointLabel),
    access_point_street: point.street,
    access_point_type: point.pickupPointType ?? point.group,
    access_point_zip: point.zip,
    access_point_city: point.city,
    access_point_country: point.country,
  }

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value != null && value !== "")
  )
}

function resolvePacketaPointLabel(
  point: PacketaPickupPoint,
  fallbackPointLabel: string
) {
  return point.place || point.name || point.id || fallbackPointLabel
}

function formatPacketaAddress(point: PacketaPickupPoint) {
  const addressParts = [point.street, point.zip, point.city].filter(Boolean)

  return addressParts.length > 0 ? addressParts.join(", ") : null
}
