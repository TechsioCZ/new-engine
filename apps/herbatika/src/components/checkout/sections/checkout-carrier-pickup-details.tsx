"use client"

import type { CarrierPickupRequirement } from "../carrier-pickup.utils"
import { CheckoutPacketaPickupSelector } from "./checkout-packeta-pickup-selector"
import { CheckoutPplPickupSelector } from "./checkout-ppl-pickup-selector"

type CheckoutCarrierPickupDetailsProps = {
  disabled: boolean
  requirement: CarrierPickupRequirement
  onConfirm: (data: Record<string, unknown>) => void
}

export function CheckoutCarrierPickupDetails({
  disabled,
  requirement,
  onConfirm,
}: CheckoutCarrierPickupDetailsProps) {
  return requirement.carrier === "ppl" ? (
    <CheckoutPplPickupSelector disabled={disabled} onConfirm={onConfirm} />
  ) : (
    <CheckoutPacketaPickupSelector disabled={disabled} onConfirm={onConfirm} />
  )
}
