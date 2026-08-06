import { resolveEffectiveCheckoutAddressDetails } from "@/lib/forms/checkout/address.form"
import type {
  CheckoutAddressDetailsValues,
  CheckoutDetailsValues,
} from "@/lib/forms/checkout/address.form"

import {
  overlayStoredAddressValues,
  pickCheckoutLocalOnlyAddressValues,
} from "./checkout-details-storage"
import type { CheckoutStoredState } from "./checkout-details-storage"

const resolveNextStoredCheckoutState = ({
  currentState,
  nextValues,
}: {
  currentState: CheckoutStoredState
  nextValues: Partial<CheckoutAddressDetailsValues>
}): CheckoutStoredState => {
  const effectiveValues =
    nextValues.billing && nextValues.shipping
      ? resolveEffectiveCheckoutAddressDetails({
          billing: nextValues.billing,
          isCompanyPurchase:
            nextValues.isCompanyPurchase ??
            currentState.isCompanyPurchase ??
            false,
          shipping: nextValues.shipping,
          useSameAddress:
            nextValues.useSameAddress ?? currentState.useSameAddress ?? true,
        })
      : undefined

  return {
    ...currentState,
    ...(typeof nextValues.isCompanyPurchase === "boolean"
      ? { isCompanyPurchase: nextValues.isCompanyPurchase }
      : {}),
    ...(typeof nextValues.useSameAddress === "boolean"
      ? { useSameAddress: nextValues.useSameAddress }
      : {}),
    ...(effectiveValues
      ? {
          billing: pickCheckoutLocalOnlyAddressValues(effectiveValues.billing),
          shipping: pickCheckoutLocalOnlyAddressValues(
            effectiveValues.shipping,
          ),
        }
      : {}),
  }
}

export const resolveStoredCheckoutTogglePreferences = ({
  currentPreferences,
  nextIsCompanyPurchase,
  nextUseSameAddress,
}: {
  currentPreferences: CheckoutStoredState
  nextIsCompanyPurchase?: boolean
  nextUseSameAddress?: boolean
}) =>
  resolveNextStoredCheckoutState({
    currentState: currentPreferences,
    nextValues: {
      ...(typeof nextIsCompanyPurchase === "boolean"
        ? { isCompanyPurchase: nextIsCompanyPurchase }
        : {}),
      ...(typeof nextUseSameAddress === "boolean"
        ? { useSameAddress: nextUseSameAddress }
        : {}),
    },
  })

export const resolveStoredCheckoutStateFromValues = ({
  currentState,
  values,
}: {
  currentState: CheckoutStoredState
  values: CheckoutDetailsValues
}) =>
  resolveNextStoredCheckoutState({
    currentState,
    nextValues: values,
  })

export const resolveHydratedValuesWithStoredState = ({
  hydratedValues,
  storedState,
}: {
  hydratedValues: CheckoutDetailsValues
  storedState: CheckoutStoredState
}): CheckoutDetailsValues => {
  const valuesWithLocalFields = {
    ...hydratedValues,
    billing: overlayStoredAddressValues({
      address: hydratedValues.billing,
      ...(storedState.billing === undefined
        ? {}
        : { storedAddress: storedState.billing }),
    }),
    shipping: overlayStoredAddressValues({
      address: hydratedValues.shipping,
      ...(storedState.shipping === undefined
        ? {}
        : { storedAddress: storedState.shipping }),
    }),
  }

  return {
    ...valuesWithLocalFields,
    isCompanyPurchase:
      typeof storedState.isCompanyPurchase === "boolean"
        ? storedState.isCompanyPurchase
        : hydratedValues.isCompanyPurchase,
    useSameAddress:
      typeof storedState.useSameAddress === "boolean"
        ? storedState.useSameAddress
        : hydratedValues.useSameAddress,
  }
}
