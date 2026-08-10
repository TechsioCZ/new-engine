"use client"

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react"

import { resolveEffectiveCheckoutAddressDetails } from "@/lib/forms/checkout/address.form"
import type { CheckoutDetailsValues } from "@/lib/forms/checkout/address.form"
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form"

import type { CarrierPickupAddress } from "./carrier-pickup-address.utils"
import {
  syncCarrierPickupBillingFields,
  syncCarrierPickupShippingFields,
} from "./checkout-details-form-sync.utils"

interface UseCheckoutDetailsFormStateProps {
  carrierPickupAddress: CarrierPickupAddress | null
  defaultValues: CheckoutDetailsValues
  hasCarrierPickupShipping: boolean
  isCartLoading: boolean
  isCustomerLoading: boolean
  onSubmit: (values: CheckoutDetailsValues) => Promise<void>
}

export const useCheckoutDetailsFormState = ({
  carrierPickupAddress,
  defaultValues,
  hasCarrierPickupShipping,
  isCartLoading,
  isCustomerLoading,
  onSubmit,
}: UseCheckoutDetailsFormStateProps) => {
  const form = useHerbatikaForm({
    defaultValues,
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
  const hydratedValuesKey = JSON.stringify(defaultValues)
  const resetHydratedValues = useEffectEvent(() => {
    form.reset(defaultValues)
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

  return { effectiveValues, form, isDirty, lastHydratedKeyRef, values }
}
