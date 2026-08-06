import { isRecord } from "@techsio/std/object"

import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form"

const readString = (value: unknown) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim()
  }

  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : undefined
}

export interface CarrierPickupAddress {
  address: Pick<
    CheckoutAddressValues,
    "address1" | "address2" | "city" | "countryCode" | "postalCode"
  >
  label: string
}

export const resolveCarrierPickupAddress = (
  data: unknown,
  fallbackCountryCode: string,
  fallbackLabel: string,
): CarrierPickupAddress | null => {
  if (
    !(
      isRecord(data) &&
      readString(Reflect.get(data, "access_point_id")) !== undefined
    )
  ) {
    return null
  }

  const label =
    readString(Reflect.get(data, "access_point_name")) ?? fallbackLabel
  const street = readString(Reflect.get(data, "access_point_street"))
  const city = readString(Reflect.get(data, "access_point_city")) ?? ""
  const postalCode = readString(Reflect.get(data, "access_point_zip")) ?? ""
  const countryCode = (
    readString(Reflect.get(data, "access_point_country")) ?? fallbackCountryCode
  ).toUpperCase()

  return {
    address: {
      address1: label,
      address2: street !== undefined && street !== label ? street : "",
      city,
      countryCode,
      postalCode,
    },
    label,
  }
}

export const formatCarrierPickupAddress = (address: CarrierPickupAddress) => {
  const addressParts = [
    address.address.address2,
    address.address.postalCode,
    address.address.city,
  ].filter(Boolean)

  return addressParts.length > 0
    ? addressParts.join(", ")
    : address.address.countryCode
}
