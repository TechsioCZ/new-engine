import type { HttpTypes } from "@medusajs/types"
import type {
  CustomerAddressCreateInput,
  CustomerAddressUpdateInput,
} from "@/lib/storefront/customers"
import type { HerbatikaCountryCode } from "@/lib/storefront/market-context"

export type CustomerAddress = Pick<
  HttpTypes.StoreCustomerAddress,
  | "id"
  | "first_name"
  | "last_name"
  | "company"
  | "address_1"
  | "city"
  | "postal_code"
  | "country_code"
  | "phone"
  | "is_default_shipping"
  | "is_default_billing"
>

export type AccountAddressFormValues = {
  first_name: string
  last_name: string
  company: string
  address_1: string
  city: string
  postal_code: string
  country_code: HerbatikaCountryCode
  phone: string
  is_default_shipping: boolean
  is_default_billing: boolean
}

const HERBATIKA_COUNTRY_CODES = new Set<HerbatikaCountryCode>([
  "sk",
  "cz",
  "hu",
  "ro",
])

const optionalTrimmed = (value: string) => value.trim() || undefined

export const resolveAddressMarket = (
  countryCode: string | null | undefined
): HerbatikaCountryCode | null => {
  const normalized = countryCode?.trim().toLowerCase()
  return normalized &&
    HERBATIKA_COUNTRY_CODES.has(normalized as HerbatikaCountryCode)
    ? (normalized as HerbatikaCountryCode)
    : null
}

export const canManageAddressInMarket = (
  address: Pick<CustomerAddress, "country_code">,
  market: HerbatikaCountryCode
): boolean => resolveAddressMarket(address.country_code) === market

export const resolveAddressCountryCode = (
  countryCode: string | null | undefined,
  fallback: HerbatikaCountryCode
): HerbatikaCountryCode => resolveAddressMarket(countryCode) ?? fallback

export const createEmptyAccountAddressValues = (
  countryCode: HerbatikaCountryCode
): AccountAddressFormValues => ({
  first_name: "",
  last_name: "",
  company: "",
  address_1: "",
  city: "",
  postal_code: "",
  country_code: countryCode,
  phone: "",
  is_default_shipping: false,
  is_default_billing: false,
})

export const toAccountAddressFormValues = (
  address: CustomerAddress | null,
  fallbackCountryCode: HerbatikaCountryCode
): AccountAddressFormValues =>
  address
    ? {
        first_name: address.first_name ?? "",
        last_name: address.last_name ?? "",
        company: address.company ?? "",
        address_1: address.address_1 ?? "",
        city: address.city ?? "",
        postal_code: address.postal_code ?? "",
        country_code: resolveAddressCountryCode(
          address.country_code,
          fallbackCountryCode
        ),
        phone: address.phone ?? "",
        is_default_shipping: Boolean(address.is_default_shipping),
        is_default_billing: Boolean(address.is_default_billing),
      }
    : createEmptyAccountAddressValues(fallbackCountryCode)

export const toCustomerAddressCreateInput = (
  values: AccountAddressFormValues,
  normalizedPhone: string | undefined
): CustomerAddressCreateInput => ({
  first_name: values.first_name.trim(),
  last_name: values.last_name.trim(),
  company: optionalTrimmed(values.company),
  address_1: values.address_1.trim(),
  city: values.city.trim(),
  postal_code: values.postal_code.trim(),
  country_code: values.country_code,
  phone: normalizedPhone,
  is_default_shipping: values.is_default_shipping,
  is_default_billing: values.is_default_billing,
})

export const toCustomerAddressUpdateInput = (
  addressId: string,
  values: AccountAddressFormValues,
  normalizedPhone: string | undefined
): CustomerAddressUpdateInput => ({
  addressId,
  ...toCustomerAddressCreateInput(values, normalizedPhone),
})
