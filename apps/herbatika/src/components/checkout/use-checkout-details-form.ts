"use client"

import type { HttpTypes } from "@medusajs/types"
import { useStore } from "@tanstack/react-form"
import { useEffect, useMemo, useRef, useState } from "react"

import {
  CHECKOUT_BILLING_ACTIVE_FIELD_NAMES,
  CHECKOUT_BILLING_COMPANY_FIELD_NAMES,
  CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES,
  type CheckoutScopedFieldName,
} from "@/components/checkout/checkout-address.utils"
import {
  CHECKOUT_ADDRESS_FIELDS,
  type CheckoutDetailsValues,
  resolveEffectiveCheckoutAddressDetails,
} from "@/lib/forms/checkout/address.form"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"

import { resolveCarrierPickupAddress } from "./carrier-pickup-address.utils"
import { readStoredCarrierPickupSelection } from "./carrier-pickup-selection-storage"
import {
  syncCarrierPickupBillingFields,
  syncCarrierPickupShippingFields,
} from "./checkout-carrier-pickup-sync"
import {
  createCheckoutStorageKey,
  readStoredCheckoutState,
  resolveHydratedValuesWithStoredState,
  resolveStoredCheckoutStateFromValues,
  resolveStoredCheckoutTogglePreferences,
  writeStoredCheckoutState,
} from "./checkout-details-storage"
import {
  mergeCheckoutAddressValues,
  resolveCheckoutHydratedValues,
} from "./checkout-details-values"

type UseCheckoutDetailsFormProps = {
  cart: HttpTypes.StoreCart | null | undefined
  customer: HttpTypes.StoreCustomer | null | undefined
  isCartLoading: boolean
  isCustomerLoading: boolean
  onSubmit: (values: CheckoutDetailsValues) => Promise<void>
  regionCountryCode?: string
}

export function useCheckoutDetailsForm({
  cart,
  customer,
  isCartLoading,
  isCustomerLoading,
  onSubmit,
  regionCountryCode,
}: UseCheckoutDetailsFormProps) {
  const selectedShippingMethod = cart?.shipping_methods?.[0]
  const storedCarrierPickupSelection = useMemo(
    () =>
      readStoredCarrierPickupSelection({
        ...(cart?.id === undefined ? {} : { cartId: cart.id }),
        ...(selectedShippingMethod?.shipping_option_id === undefined
          ? {}
          : { optionId: selectedShippingMethod.shipping_option_id }),
      }),
    [cart?.id, selectedShippingMethod?.shipping_option_id]
  )
  const carrierPickupAddress = useMemo(
    () =>
      resolveCarrierPickupAddress(
        selectedShippingMethod?.data,
        regionCountryCode
      ) ??
      resolveCarrierPickupAddress(
        storedCarrierPickupSelection?.data,
        regionCountryCode
      ),
    [
      selectedShippingMethod?.data,
      storedCarrierPickupSelection?.data,
      regionCountryCode,
    ]
  )
  const hasCarrierPickupShipping = Boolean(carrierPickupAddress)
  const hydratedValues = useMemo(
    () =>
      resolveCheckoutHydratedValues({
        carrierPickupAddress,
        cart,
        customer,
        ...(regionCountryCode === undefined ? {} : { regionCountryCode }),
      }),
    [carrierPickupAddress, cart, customer, regionCountryCode]
  )
  const storageKey = useMemo(
    () => createCheckoutStorageKey(cart?.id),
    [cart?.id]
  )
  const [storedState, setStoredState] = useState(() =>
    readStoredCheckoutState(storageKey)
  )
  const hydratedValuesWithStoredState = useMemo(() => {
    const nextValues = resolveHydratedValuesWithStoredState({
      hydratedValues,
      storedState,
    })

    return hasCarrierPickupShipping
      ? { ...nextValues, useSameAddress: false }
      : nextValues
  }, [hasCarrierPickupShipping, hydratedValues, storedState])
  const form = useHerbatikaForm({
    defaultValues: hydratedValuesWithStoredState,
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })
  const values = useStore(form.store, (state) => state.values)
  const isDirty = useStore(form.store, (state) => state.isDirty)
  const effectiveValues = useMemo(
    () => resolveEffectiveCheckoutAddressDetails(values),
    [values]
  )
  const lastHydratedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    setStoredState(readStoredCheckoutState(storageKey))
  }, [storageKey])

  useEffect(() => {
    if (isCartLoading || isCustomerLoading || isDirty) {
      return
    }

    const nextHydratedKey = JSON.stringify(hydratedValuesWithStoredState)
    if (lastHydratedKeyRef.current === nextHydratedKey) {
      return
    }

    form.reset(hydratedValuesWithStoredState)
    lastHydratedKeyRef.current = nextHydratedKey
  }, [
    form,
    hydratedValuesWithStoredState,
    isCartLoading,
    isCustomerLoading,
    isDirty,
  ])

  useEffect(() => {
    if (!hasCarrierPickupShipping) {
      return
    }

    syncCarrierPickupShippingFields({
      form,
      pickupAddress: carrierPickupAddress?.address,
      values,
    })
    syncCarrierPickupBillingFields(form, values)
  }, [carrierPickupAddress, form, hasCarrierPickupShipping, values])

  const storeState = (nextState: typeof storedState) => {
    setStoredState(nextState)
    writeStoredCheckoutState({ nextState, storageKey })
  }

  const resetToValues = (nextValues: CheckoutDetailsValues) => {
    storeState(
      resolveStoredCheckoutStateFromValues({
        currentState: storedState,
        values: nextValues,
      })
    )
    form.reset(nextValues)
    lastHydratedKeyRef.current = JSON.stringify(nextValues)
  }

  const copyShippingIntoBilling = () => {
    const nextBillingValues = mergeCheckoutAddressValues(values.shipping)
    for (const field of CHECKOUT_ADDRESS_FIELDS) {
      form.setFieldValue(`billing.${field}`, nextBillingValues[field])
    }
  }

  const clearFieldValidationState = (
    fieldNames: readonly CheckoutScopedFieldName[]
  ) => {
    for (const fieldName of fieldNames) {
      form.setFieldMeta(fieldName, (previous) => ({
        ...previous,
        errorMap: {},
        errorSourceMap: {},
        isBlurred: false,
        isTouched: false,
        isValidating: false,
      }))
    }
  }

  const trackUseSameAddressIntent = (nextValue: boolean) => {
    if (hasCarrierPickupShipping && nextValue) {
      return
    }

    storeState(
      resolveStoredCheckoutTogglePreferences({
        currentPreferences: storedState,
        nextUseSameAddress: nextValue,
      })
    )
    if (nextValue) {
      clearFieldValidationState(CHECKOUT_BILLING_ACTIVE_FIELD_NAMES)
    } else if (values.isCompanyPurchase) {
      clearFieldValidationState(CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES)
    }
  }

  const setCompanyPurchase = (nextValue: boolean) => {
    storeState(
      resolveStoredCheckoutTogglePreferences({
        currentPreferences: storedState,
        nextIsCompanyPurchase: nextValue,
      })
    )
    form.setFieldValue("isCompanyPurchase", nextValue)
    if (!nextValue) {
      clearFieldValidationState(
        values.useSameAddress
          ? CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES
          : CHECKOUT_BILLING_COMPANY_FIELD_NAMES
      )
    }
  }

  return {
    carrierPickupAddress,
    copyShippingIntoBilling,
    effectiveValues,
    form,
    hasCarrierPickupShipping,
    hasStoredBillingAddress: Boolean(cart?.billing_address),
    hydratedValues,
    isDirty,
    resetToValues,
    setCompanyPurchase,
    trackUseSameAddressIntent,
    values,
  }
}

export type CheckoutDetailsFormController = ReturnType<
  typeof useCheckoutDetailsForm
>
