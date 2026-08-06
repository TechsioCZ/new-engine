"use client"

import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import {
  CHECKOUT_BILLING_ACTIVE_FIELD_NAMES,
  CHECKOUT_BILLING_COMPANY_FIELD_NAMES,
  CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES,
} from "@/components/checkout/checkout-address.utils"
import type { CheckoutScopedFieldName } from "@/components/checkout/checkout-address.utils"
import {
  CHECKOUT_ADDRESS_FIELDS,
  resolveEffectiveCheckoutAddressDetails,
} from "@/lib/forms/checkout/address.form"
import type { CheckoutDetailsValues } from "@/lib/forms/checkout/address.form"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

import { resolveCarrierPickupAddress } from "./carrier-pickup-address.utils"
import { readStoredCarrierPickupSelection } from "./carrier-pickup-selection-storage"
import {
  syncCarrierPickupBillingFields,
  syncCarrierPickupShippingFields,
} from "./checkout-details-form-sync.utils"
import {
  mergeCheckoutAddressValues,
  resolveCheckoutHydratedValues,
} from "./checkout-details-hydration.utils"
import {
  resolveHydratedValuesWithStoredState,
  resolveStoredCheckoutStateFromValues,
  resolveStoredCheckoutTogglePreferences,
} from "./checkout-details-state.utils"
import {
  createCheckoutToggleStorageKey,
  readStoredCheckoutState,
  writeStoredCheckoutState,
} from "./checkout-details-storage"
import type { CheckoutStoredState } from "./checkout-details-storage"

interface UseCheckoutDetailsFormProps {
  cart: HttpTypes.StoreCart | null | undefined
  customer: HttpTypes.StoreCustomer | null | undefined
  isCartLoading: boolean
  isCustomerLoading: boolean
  onSubmit: (values: CheckoutDetailsValues) => Promise<void>
  regionCountryCode?: string
}

export const useCheckoutDetailsForm = ({
  cart,
  customer,
  isCartLoading,
  isCustomerLoading,
  onSubmit,
  regionCountryCode,
}: UseCheckoutDetailsFormProps) => {
  const tCheckout = useTranslations("checkout")
  const marketContext = useMarketContext()
  const fallbackCountryCode = regionCountryCode ?? marketContext.countryCode
  const fallbackPickupLabel = tCheckout("pickup_point_fallback")
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
  const setStoredState = (state: CheckoutStoredState) => {
    setStoredSnapshot({ state, storageKey: toggleStorageKey })
  }
  const nextHydratedValues = resolveHydratedValuesWithStoredState({
    hydratedValues,
    storedState,
  })
  const hydratedValuesWithTogglePreferences = hasCarrierPickupShipping
    ? { ...nextHydratedValues, useSameAddress: false }
    : nextHydratedValues
  const form = useHerbatikaForm({
    defaultValues: hydratedValuesWithTogglePreferences,
    onSubmit: async ({ value }) => {
      await onSubmit(value)
    },
  })

  const formState = useSyncExternalStore(
    (listener) => {
      const subscription = form.store.subscribe(listener)
      return () => {
        subscription.unsubscribe()
      }
    },
    () => form.store.state,
    () => form.store.state,
  )
  const { isDirty, values } = formState
  const effectiveValues = resolveEffectiveCheckoutAddressDetails(values)
  const lastHydratedKeyRef = useRef<string | null>(null)
  const hydratedValuesKey = JSON.stringify(hydratedValuesWithTogglePreferences)
  const resetHydratedValues = useEffectEvent(() => {
    form.reset(hydratedValuesWithTogglePreferences)
  })

  useLayoutEffect(() => {
    if (isCartLoading || isCustomerLoading || isDirty) {
      return
    }

    if (lastHydratedKeyRef.current === hydratedValuesKey) {
      return
    }

    resetHydratedValues()
    lastHydratedKeyRef.current = hydratedValuesKey
  }, [hydratedValuesKey, isCartLoading, isCustomerLoading, isDirty])

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

  const resetToValues = (nextValues: CheckoutDetailsValues) => {
    const nextStoredState = resolveStoredCheckoutStateFromValues({
      currentState: storedState,
      values: nextValues,
    })

    setStoredState(nextStoredState)
    writeStoredCheckoutState({
      nextState: nextStoredState,
      storageKey: toggleStorageKey,
    })
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
    fieldNames: readonly CheckoutScopedFieldName[],
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

    const nextTogglePreferences = resolveStoredCheckoutTogglePreferences({
      currentPreferences: storedState,
      nextUseSameAddress: nextValue,
    })

    setStoredState(nextTogglePreferences)
    writeStoredCheckoutState({
      nextState: nextTogglePreferences,
      storageKey: toggleStorageKey,
    })

    if (nextValue) {
      clearFieldValidationState(CHECKOUT_BILLING_ACTIVE_FIELD_NAMES)
      return
    }

    if (values.isCompanyPurchase) {
      clearFieldValidationState(CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES)
    }
  }

  const setCompanyPurchase = (nextValue: boolean) => {
    const nextTogglePreferences = resolveStoredCheckoutTogglePreferences({
      currentPreferences: storedState,
      nextIsCompanyPurchase: nextValue,
    })

    setStoredState(nextTogglePreferences)
    writeStoredCheckoutState({
      nextState: nextTogglePreferences,
      storageKey: toggleStorageKey,
    })
    form.setFieldValue("isCompanyPurchase", nextValue)

    if (nextValue) {
      return
    }

    clearFieldValidationState(
      values.useSameAddress
        ? CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES
        : CHECKOUT_BILLING_COMPANY_FIELD_NAMES,
    )
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
