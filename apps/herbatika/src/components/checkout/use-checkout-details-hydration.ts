"use client"

import type { HttpTypes } from "@medusajs/types"
import { useState } from "react"

import type { CheckoutDetailsValues } from "@/lib/forms/checkout/address.form"

import { resolveCarrierPickupAddress } from "./carrier-pickup-address.utils"
import { readStoredCarrierPickupSelection } from "./carrier-pickup-selection-storage"
import { resolveCheckoutHydratedValues } from "./checkout-details-hydration.utils"
import { resolveHydratedValuesWithStoredState } from "./checkout-details-state.utils"
import {
  createCheckoutToggleStorageKey,
  readStoredCheckoutState,
  writeStoredCheckoutState,
} from "./checkout-details-storage"
import type { CheckoutStoredState } from "./checkout-details-storage"

interface UseCheckoutDetailsHydrationProps {
  cart: HttpTypes.StoreCart | null | undefined
  customer: HttpTypes.StoreCustomer | null | undefined
  fallbackCountryCode: string
  fallbackPickupLabel: string
  regionCountryCode?: string
}

export const useCheckoutDetailsHydration = ({
  cart,
  customer,
  fallbackCountryCode,
  fallbackPickupLabel,
  regionCountryCode,
}: UseCheckoutDetailsHydrationProps) => {
  const selectedShippingMethod = cart?.shipping_methods?.[0]
  const storedCarrierPickupSelection = readStoredCarrierPickupSelection({
    ...(cart?.id === undefined ? {} : { cartId: cart.id }),
    ...(selectedShippingMethod?.shipping_option_id === undefined
      ? {}
      : { optionId: selectedShippingMethod.shipping_option_id }),
  })
  const carrierPickupAddress =
    resolveCarrierPickupAddress(
      selectedShippingMethod?.data,
      fallbackCountryCode,
      fallbackPickupLabel,
    ) ??
    resolveCarrierPickupAddress(
      storedCarrierPickupSelection?.data,
      fallbackCountryCode,
      fallbackPickupLabel,
    )
  const hasCarrierPickupShipping = Boolean(carrierPickupAddress)
  const hydratedValues = resolveCheckoutHydratedValues({
    carrierPickupAddress,
    cart,
    customer,
    ...(regionCountryCode === undefined ? {} : { regionCountryCode }),
  })
  const toggleStorageKey = createCheckoutToggleStorageKey(cart?.id)
  const [storedSnapshot, setStoredSnapshot] = useState(() => ({
    state: readStoredCheckoutState(toggleStorageKey),
    storageKey: toggleStorageKey,
  }))
  if (storedSnapshot.storageKey !== toggleStorageKey) {
    setStoredSnapshot({
      state: readStoredCheckoutState(toggleStorageKey),
      storageKey: toggleStorageKey,
    })
  }
  const storedState =
    storedSnapshot.storageKey === toggleStorageKey
      ? storedSnapshot.state
      : readStoredCheckoutState(toggleStorageKey)
  const persistStoredState = (nextState: CheckoutStoredState) => {
    setStoredSnapshot({ state: nextState, storageKey: toggleStorageKey })
    writeStoredCheckoutState({ nextState, storageKey: toggleStorageKey })
  }
  const nextHydratedValues = resolveHydratedValuesWithStoredState({
    hydratedValues,
    storedState,
  })
  const defaultValues: CheckoutDetailsValues = hasCarrierPickupShipping
    ? { ...nextHydratedValues, useSameAddress: false }
    : nextHydratedValues

  return {
    carrierPickupAddress,
    defaultValues,
    hasCarrierPickupShipping,
    hydratedValues,
    persistStoredState,
    storedState,
  }
}
