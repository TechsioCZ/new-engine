"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { useMemo, useRef, useState } from "react";
import { PacketaPickupWidget } from "../packeta-widget";
import type {
  PacketaPickupPoint,
  PacketaWidgetError,
  PacketaWidgetHandle,
  PacketaWidgetOptions,
} from "../packeta-widget.types";

type CheckoutPacketaPickupSelectorProps = {
  disabled: boolean;
  onConfirm: (data: Record<string, unknown>) => void;
};

const PACKETA_WIDGET_API_KEY =
  process.env.NEXT_PUBLIC_PACKETA_WIDGET_API_KEY?.trim() ?? "";
const DEFAULT_PACKETA_COUNTRY = "sk";
const PACKETA_WIDGET_COUNTRIES =
  process.env.NEXT_PUBLIC_PACKETA_WIDGET_COUNTRIES?.trim() ??
  DEFAULT_PACKETA_COUNTRY;

export function CheckoutPacketaPickupSelector({
  disabled,
  onConfirm,
}: CheckoutPacketaPickupSelectorProps) {
  const widgetRef = useRef<PacketaWidgetHandle | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<PacketaPickupPoint | null>(
    null,
  );

  const widgetOptions = useMemo<PacketaWidgetOptions>(() => {
    const countries = resolvePacketaCountries(PACKETA_WIDGET_COUNTRIES);

    return {
      appIdentity: "herbatika-next-checkout",
      country: countries.join(","),
      language: "sk",
      vendors: countries.flatMap((country, index) => [
        { country, group: "", selected: index === 0 },
        { country, group: "zbox" },
      ]),
      webUrl:
        typeof window === "undefined" ? undefined : window.location.origin,
    };
  }, []);

  if (!PACKETA_WIDGET_API_KEY) {
    return (
      <StatusText showIcon size="sm" status="error">
        Chýba konfigurácia Packeta widgetu. Doplňte
        NEXT_PUBLIC_PACKETA_WIDGET_API_KEY a reštartujte dev server.
      </StatusText>
    );
  }

  const handleOpenWidget = () => {
    setErrorMessage(null);
    widgetRef.current?.open();
  };

  const handleWidgetError = (error: PacketaWidgetError) => {
    setErrorMessage(error.message || "Packeta widget sa nepodarilo načítať.");
  };

  const handleSelect = (point: PacketaPickupPoint) => {
    if (!point.id) {
      setErrorMessage("Packeta nevrátila ID výdajného miesta.");
      return;
    }

    if (point.error) {
      setErrorMessage("Vybrané výdajné miesto nie je aktuálne dostupné.");
      return;
    }

    setSelectedPoint(point);
    setErrorMessage(null);
    onConfirm(buildPacketaShippingData(point));
  };

  return (
    <div className="grid gap-150">
      {selectedPoint ? (
        <div className="grid gap-50">
          <p className="text-sm font-medium text-fg-primary">
            Výdajné miesto: {resolvePacketaPointLabel(selectedPoint)}
          </p>
          <p className="text-xs text-fg-secondary">
            {formatPacketaAddress(selectedPoint)}
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

      <PacketaPickupWidget
        apiKey={PACKETA_WIDGET_API_KEY}
        onError={handleWidgetError}
        onSelect={handleSelect}
        options={widgetOptions}
        ref={widgetRef}
      />
    </div>
  );
}

function buildPacketaShippingData(point: PacketaPickupPoint) {
  const payload: Record<string, unknown> = {
    access_point_id: point.id,
    access_point_name: resolvePacketaPointLabel(point),
    access_point_street: point.street,
    access_point_type: point.pickupPointType ?? point.group,
    access_point_zip: point.zip,
    access_point_city: point.city,
    access_point_country: point.country,
  };

  return Object.fromEntries(
    Object.entries(payload).filter(
      ([, value]) => value != null && value !== "",
    ),
  );
}

function resolvePacketaCountries(value: string) {
  const countries = value
    .split(",")
    .map((country) => country.trim().toLowerCase())
    .filter(Boolean);

  return countries.length > 0 ? countries : [DEFAULT_PACKETA_COUNTRY];
}

function resolvePacketaPointLabel(point: PacketaPickupPoint) {
  return point.place || point.name || point.id || "Packeta Z-Point";
}

function formatPacketaAddress(point: PacketaPickupPoint) {
  const addressParts = [point.street, point.zip, point.city].filter(Boolean);

  return addressParts.length > 0 ? addressParts.join(", ") : "Packeta Z-Point";
}
