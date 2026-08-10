"use client"

import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"

import {
  CHECKOUT_BILLING_ACTIVE_FIELD_NAMES,
  CHECKOUT_BILLING_COMPANY_FIELD_NAMES,
  CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES,
} from "@/components/checkout/checkout-address.utils"
import type { CheckoutScopedFieldName } from "@/components/checkout/checkout-address.utils"
import { CHECKOUT_ADDRESS_FIELDS } from "@/lib/forms/checkout/address.form"
import type { CheckoutDetailsValues } from "@/lib/forms/checkout/address.form"
import { useMarketContext } from "@/lib/storefront/market-context-provider"

import { mergeCheckoutAddressValues } from "./checkout-details-hydration.utils"
import {
  resolveStoredCheckoutStateFromValues,
  resolveStoredCheckoutTogglePreferences,
} from "./checkout-details-state.utils"
import { useCheckoutDetailsFormState } from "./use-checkout-details-form-state"
import { useCheckoutDetailsHydration } from "./use-checkout-details-hydration"

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
  const hydration = useCheckoutDetailsHydration({
    cart,
    customer,
    fallbackCountryCode: regionCountryCode ?? marketContext.countryCode,
    fallbackPickupLabel: tCheckout("pickup_point_fallback"),
    ...(regionCountryCode === undefined ? {} : { regionCountryCode }),
  })
  const { effectiveValues, form, isDirty, lastHydratedKeyRef, values } =
    useCheckoutDetailsFormState({
      carrierPickupAddress: hydration.carrierPickupAddress,
      defaultValues: hydration.defaultValues,
      hasCarrierPickupShipping: hydration.hasCarrierPickupShipping,
      isCartLoading,
      isCustomerLoading,
      onSubmit,
    })

  const resetToValues = (nextValues: CheckoutDetailsValues) => {
    const nextStoredState = resolveStoredCheckoutStateFromValues({
      currentState: hydration.storedState,
      values: nextValues,
    })
    hydration.persistStoredState(nextStoredState)
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
    if (hydration.hasCarrierPickupShipping && nextValue) {
      return
    }
    const nextTogglePreferences = resolveStoredCheckoutTogglePreferences({
      currentPreferences: hydration.storedState,
      nextUseSameAddress: nextValue,
    })
    hydration.persistStoredState(nextTogglePreferences)

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
      currentPreferences: hydration.storedState,
      nextIsCompanyPurchase: nextValue,
    })
    hydration.persistStoredState(nextTogglePreferences)
    form.setFieldValue("isCompanyPurchase", nextValue)

    if (!nextValue) {
      clearFieldValidationState(
        values.useSameAddress
          ? CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES
          : CHECKOUT_BILLING_COMPANY_FIELD_NAMES,
      )
    }
  }

  return {
    carrierPickupAddress: hydration.carrierPickupAddress,
    copyShippingIntoBilling,
    effectiveValues,
    form,
    hasCarrierPickupShipping: hydration.hasCarrierPickupShipping,
    hasStoredBillingAddress: Boolean(cart?.billing_address),
    hydratedValues: hydration.hydratedValues,
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
