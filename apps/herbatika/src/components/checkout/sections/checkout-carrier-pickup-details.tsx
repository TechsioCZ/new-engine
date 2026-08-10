"use client"

import type {
  CarrierPickupData,
  CarrierPickupRequirement,
} from "../carrier-pickup.utils"
import { CheckoutGlsPickupSelector } from "./checkout-gls-pickup-selector"
import { CheckoutPacketaPickupSelector } from "./checkout-packeta-pickup-selector"
import { CheckoutPplPickupSelector } from "./checkout-ppl-pickup-selector"

interface CheckoutCarrierPickupDetailsProps {
  disabled: boolean
  requirement: CarrierPickupRequirement
  onConfirm: (data: CarrierPickupData) => void
}

export const CheckoutCarrierPickupDetails = ({
  disabled,
  requirement,
  onConfirm,
}: CheckoutCarrierPickupDetailsProps) => {
  if (requirement.carrier === "gls") {
    return (
      <CheckoutGlsPickupSelector disabled={disabled} onConfirm={onConfirm} />
    )
  }

  return requirement.carrier === "ppl" ? (
    <CheckoutPplPickupSelector disabled={disabled} onConfirm={onConfirm} />
  ) : (
    <CheckoutPacketaPickupSelector disabled={disabled} onConfirm={onConfirm} />
  )
}
