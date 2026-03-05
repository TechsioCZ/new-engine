import type { HttpTypes } from "@medusajs/types"
import type { PplAccessPointData } from "@/app/pokladna/_components/ppl-widget"
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants"
import type { ShippingMethodData } from "@/types/cart"
import type { AddressFormData } from "./address-validation"
import { formatPhoneNumber } from "./format/format-phone-number"
import { formatPostalCode } from "./format/format-postal-code"

export type { PplAccessPointData } from "@/app/pokladna/_components/ppl-widget"

export const DEFAULT_ADDRESS: AddressFormData = {
  first_name: "",
  last_name: "",
  company: "",
  address_1: "",
  address_2: "",
  city: "",
  province: "",
  postal_code: "",
  country_code: DEFAULT_COUNTRY_CODE,
  phone: "",
}

/**
 * generic conversion of address to AddressFormData
 * works for customer address, cart address or any compatible address object
 */
function addressToFormData(
  address?:
    | Partial<HttpTypes.StoreCartAddress>
    | HttpTypes.StoreCustomerAddress
    | null
): AddressFormData {
  // Return empty form if no address provided
  if (!address) {
    return {
      ...DEFAULT_ADDRESS,
    }
  }

  // Convert address to form data (format phone/postal for display and validation)
  return {
    first_name: address.first_name || "",
    last_name: address.last_name || "",
    company: address.company || "",
    address_1: address.address_1 || "",
    address_2: address.address_2 || "",
    city: address.city || "",
    province: address.province || "",
    postal_code: formatPostalCode(address.postal_code || ""),
    country_code: address.country_code || DEFAULT_COUNTRY_CODE,
    phone: formatPhoneNumber(address.phone || ""),
  }
}

export { addressToFormData }

/**
 * get default address from customer addresses
 * The first address in the list is considered the default
 */
export function getDefaultAddress(
  addresses: HttpTypes.StoreCustomerAddress[] | undefined
): HttpTypes.StoreCustomerAddress | null {
  if (!addresses || addresses.length === 0) {
    return null
  }
  const [first] = addresses
  return first ?? null
}

/** Check if shipping option requires PPL Parcel access point selection */
export function isPPLParcelOption(optionName: string): boolean {
  const name = optionName.toLowerCase()
  return name.includes("parcel smart") || name.includes("parcelsmart")
}

/** Convert PPL access point to shipping method data */
export function accessPointToShippingData(
  accessPoint: PplAccessPointData
): ShippingMethodData {
  return {
    access_point_id: accessPoint.code,
    access_point_name: accessPoint.name,
    access_point_type: accessPoint.type,
    access_point_street: accessPoint.address?.street,
    access_point_city: accessPoint.address?.city,
    access_point_zip: accessPoint.address?.zipCode,
    access_point_country: accessPoint.address?.country,
  }
}

/** Convert PPL access point to Medusa address format for shipping_address */
export function accessPointToAddress(
  accessPoint: PplAccessPointData,
  billingAddress: AddressFormData
): AddressFormData {
  return {
    first_name: billingAddress.first_name,
    last_name: billingAddress.last_name,
    company: accessPoint.name,
    address_1: accessPoint.address?.street || "",
    address_2: "",
    city: accessPoint.address?.city || "",
    postal_code: accessPoint.address?.zipCode || "",
    country_code:
      accessPoint.address?.country?.toLowerCase() || DEFAULT_COUNTRY_CODE,
    province: "",
    phone: billingAddress.phone,
  }
}
