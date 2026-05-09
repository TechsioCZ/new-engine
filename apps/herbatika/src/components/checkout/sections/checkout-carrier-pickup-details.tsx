"use client";

import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import type { CarrierPickupRequirement } from "../carrier-pickup.utils";
import { CheckoutPacketaPickupSelector } from "./checkout-packeta-pickup-selector";
import { CheckoutPplPickupSelector } from "./checkout-ppl-pickup-selector";

type CheckoutCarrierPickupDetailsProps = {
  disabled: boolean;
  requirement: CarrierPickupRequirement;
  onConfirm: (data: Record<string, unknown>) => void;
};

export function CheckoutCarrierPickupDetails({
  disabled,
  requirement,
  onConfirm,
}: CheckoutCarrierPickupDetailsProps) {
  if (requirement.carrier === "ppl") {
    return (
      <CheckoutPplPickupSelector disabled={disabled} onConfirm={onConfirm} />
    );
  }

  if (requirement.carrier === "packeta") {
    return (
      <CheckoutPacketaPickupSelector
        disabled={disabled}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <StatusText showIcon size="sm" status="warning">
      Výber výdajného miesta pre tohto dopravcu zatiaľ nie je napojený.
    </StatusText>
  );
}
