import type { HttpTypes } from "@medusajs/types"
import { hasTrimmedString } from "@techsio/std/string"

import type { PplAccessPointData } from "@/app/pokladna/_components/ppl-widget"
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants"
import type { ShippingMethodData } from "@/services/cart-service"
import type { StoreCustomerAddress } from "@/services/customer-service"

import type { AddressFormData } from "./address-validation"
import { formatPhoneNumber } from "./format/format-phone-number"
import { formatPostalCode } from "./format/format-postal-code"

export type { PplAccessPointData } from "@/app/pokladna/_components/ppl-widget"

export const DEFAULT_ADDRESS: AddressFormData = {
  address_1: "",
  address_2: "",
  city: "",
  company: "",
  country_code: DEFAULT_COUNTRY_CODE,
  first_name: "",
  last_name: "",
  phone: "",
  postal_code: "",
  province: "",
}

/**
 * generic conversion of address to AddressFormData
 * works for customer address, cart address or any compatible address object
 */
const addressToFormData = (
  address?: Partial<HttpTypes.StoreCartAddress> | StoreCustomerAddress | null,
): AddressFormData => {
  // Return empty form if no address provided
  if (!address) {
    return {
      ...DEFAULT_ADDRESS,
    }
  }

  // Convert address to form data (format phone/postal for display and validation)
  return {
    address_1: address.address_1 ?? "",
    address_2: address.address_2 ?? "",
    city: address.city ?? "",
    company: address.company ?? "",
    country_code: address.country_code ?? DEFAULT_COUNTRY_CODE,
    first_name: address.first_name ?? "",
    last_name: address.last_name ?? "",
    phone: formatPhoneNumber(address.phone ?? ""),
    postal_code: formatPostalCode(address.postal_code ?? ""),
    province: address.province ?? "",
  }
}

export { addressToFormData }

/**
 * get default address from customer addresses
 * The first address in the list is considered the default
 */
export const getDefaultAddress = (
  addresses: StoreCustomerAddress[] | undefined,
): StoreCustomerAddress | null => {
  if (!addresses || addresses.length === 0) {
    return null
  }
  const [first] = addresses
  return first ?? null
}

/** Check if shipping option requires PPL Parcel access point selection */
export const isPPLParcelOption = (optionName: string): boolean => {
  const name = optionName.toLowerCase()
  return name.includes("parcel smart") || name.includes("parcelsmart")
}

/** Convert PPL access point to shipping method data */
export const accessPointToShippingData = (
  accessPoint: PplAccessPointData,
): ShippingMethodData => {
  const { city, country, street, zipCode } = accessPoint.address ?? {}
  return {
    access_point_id: accessPoint.code,
    access_point_name: accessPoint.name,
    access_point_type: accessPoint.type,
    ...(hasTrimmedString(city) ? { access_point_city: city } : {}),
    ...(hasTrimmedString(country) ? { access_point_country: country } : {}),
    ...(hasTrimmedString(street) ? { access_point_street: street } : {}),
    ...(hasTrimmedString(zipCode) ? { access_point_zip: zipCode } : {}),
  }
}

/** Convert PPL access point to Medusa address format for shipping_address */
export const accessPointToAddress = (
  accessPoint: PplAccessPointData,
  billingAddress: AddressFormData,
): AddressFormData => ({
  address_1: accessPoint.address?.street ?? "",
  address_2: "",
  city: accessPoint.address?.city ?? "",
  company: accessPoint.name,
  country_code:
    accessPoint.address?.country?.toLowerCase() ?? DEFAULT_COUNTRY_CODE,
  first_name: billingAddress.first_name,
  last_name: billingAddress.last_name,
  postal_code: accessPoint.address?.zipCode ?? "",
  province: "",
  ...(billingAddress.phone !== null &&
  billingAddress.phone !== undefined &&
  billingAddress.phone !== ""
    ? { phone: billingAddress.phone }
    : {}),
})
