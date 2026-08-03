import type { CheckoutDetailsValues } from "@/lib/forms/checkout/address.form"

import type { CarrierPickupAddress } from "./carrier-pickup-address.utils"

type CarrierPickupSyncField =
  | "billing.address2"
  | "billing.firstName"
  | "billing.lastName"
  | "shipping.address1"
  | "shipping.address2"
  | "shipping.city"
  | "shipping.countryCode"
  | "shipping.postalCode"
  | "useSameAddress"

type CheckoutFormFieldSetter = {
  setFieldValue(field: CarrierPickupSyncField, value: string | boolean): void
}

const setCheckoutFieldIfChanged = (
  form: CheckoutFormFieldSetter,
  field: CarrierPickupSyncField,
  currentValue: string | boolean,
  nextValue: string | boolean
) => {
  if (currentValue !== nextValue) {
    form.setFieldValue(field, nextValue)
  }
}

export const syncCarrierPickupShippingFields = ({
  form,
  pickupAddress,
  values,
}: {
  form: CheckoutFormFieldSetter
  pickupAddress: CarrierPickupAddress["address"] | undefined
  values: CheckoutDetailsValues
}) => {
  if (!pickupAddress) {
    return
  }

  setCheckoutFieldIfChanged(
    form,
    "shipping.address1",
    values.shipping.address1,
    pickupAddress.address1
  )
  setCheckoutFieldIfChanged(
    form,
    "shipping.address2",
    values.shipping.address2,
    pickupAddress.address2
  )
  setCheckoutFieldIfChanged(
    form,
    "shipping.city",
    values.shipping.city,
    pickupAddress.city
  )
  setCheckoutFieldIfChanged(
    form,
    "shipping.countryCode",
    values.shipping.countryCode,
    pickupAddress.countryCode
  )
  setCheckoutFieldIfChanged(
    form,
    "shipping.postalCode",
    values.shipping.postalCode,
    pickupAddress.postalCode
  )
}

export const syncCarrierPickupBillingFields = (
  form: CheckoutFormFieldSetter,
  values: CheckoutDetailsValues
) => {
  setCheckoutFieldIfChanged(
    form,
    "useSameAddress",
    values.useSameAddress,
    false
  )
  setCheckoutFieldIfChanged(
    form,
    "billing.address2",
    values.billing.address2,
    ""
  )
  setCheckoutFieldIfChanged(
    form,
    "billing.firstName",
    values.billing.firstName,
    values.shipping.firstName
  )
  setCheckoutFieldIfChanged(
    form,
    "billing.lastName",
    values.billing.lastName,
    values.shipping.lastName
  )
}
