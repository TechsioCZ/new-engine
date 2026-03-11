import type { HttpTypes } from "@medusajs/types"
import { mapMedusaAddressToCheckoutAddress } from "@techsio/storefront-data/checkout/address"
import type { MedusaCustomerAddressCreateInput } from "@techsio/storefront-data/customers/medusa-service"
import type { CustomerAddressAdapter } from "@techsio/storefront-data/customers/types"
import type { CartAddressAdapter } from "@techsio/storefront-data/cart/types"
import type { StorefrontAddressValidationIssue } from "@techsio/storefront-data/shared/address"
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants"
import type {
  AddressErrors,
  AddressFieldKey,
  AddressFormData,
} from "@/utils/address-validation"
import { validateAddressForm } from "@/utils/address-validation"
import { cleanPhoneNumber } from "@/utils/format/format-phone-number"
import { formatPhoneNumber } from "@/utils/format/format-phone-number"
import { cleanPostalCode } from "@/utils/format/format-postal-code"
import { formatPostalCode } from "@/utils/format/format-postal-code"

export type CustomerAddressUpdateHookInput = AddressFormData & {
  addressId?: string
}

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

const trimString = (value: unknown): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed || undefined
}

const normalizeCountryCode = (value: unknown): string => {
  const normalized = trimString(value)?.toLowerCase()
  return normalized || DEFAULT_COUNTRY_CODE
}

const normalizeAddressCore = <
  T extends Partial<AddressFormData> & Record<string, unknown>,
>(
  input: T
): T => {
  const normalized = {
    ...input,
    first_name:
      typeof input.first_name === "string" ? input.first_name.trim() : input.first_name,
    last_name:
      typeof input.last_name === "string" ? input.last_name.trim() : input.last_name,
    company: trimString(input.company),
    address_1:
      typeof input.address_1 === "string" ? input.address_1.trim() : input.address_1,
    address_2: trimString(input.address_2),
    city: typeof input.city === "string" ? input.city.trim() : input.city,
    province: trimString(input.province),
    postal_code:
      typeof input.postal_code === "string"
        ? cleanPostalCode(input.postal_code)
        : input.postal_code,
    country_code:
      typeof input.country_code === "string"
        ? normalizeCountryCode(input.country_code)
        : input.country_code,
    phone:
      typeof input.phone === "string" ? cleanPhoneNumber(input.phone) : input.phone,
  }

  return normalized as T
}

const toValidationInput = (input: AddressFormData): AddressFormData => {
  const normalized = normalizeAddressCore(input)

  return {
    ...normalized,
    postal_code: formatPostalCode(normalized.postal_code),
    phone: normalized.phone ? formatPhoneNumber(normalized.phone) : "",
    country_code: normalized.country_code || DEFAULT_COUNTRY_CODE,
  }
}

const getValidationCode = (
  field: AddressFieldKey,
  input: AddressFormData
): string => {
  if (field === "phone") {
    return "invalid"
  }

  if (field === "postal_code") {
    return input.postal_code.trim() ? "invalid" : "required"
  }

  const value = input[field]
  return typeof value === "string" && value.trim() ? "invalid" : "required"
}

const toValidationIssues = (
  errors: AddressErrors,
  input: AddressFormData,
  scope: "shipping" | "billing" | "customer"
): StorefrontAddressValidationIssue[] =>
  Object.entries(errors).flatMap(([field, message]) => {
    if (!message) {
      return []
    }

    return [
      {
        scope,
        field,
        code: getValidationCode(field as AddressFieldKey, input),
        message,
      } satisfies StorefrontAddressValidationIssue,
    ]
  })

const validateAddressInput = (
  input: AddressFormData,
  scope: "shipping" | "billing" | "customer"
): StorefrontAddressValidationIssue[] | null => {
  const validationInput = toValidationInput(input)
  const errors = validateAddressForm(validationInput)
  const issues = toValidationIssues(errors, validationInput, scope)

  return issues.length > 0 ? issues : null
}

const toMedusaAddressPayload = (
  input: AddressFormData
): HttpTypes.StoreAddAddress => {
  const normalized = normalizeAddressCore(input)
  const payload: HttpTypes.StoreAddAddress = {
    first_name: normalized.first_name,
    last_name: normalized.last_name,
    address_1: normalized.address_1,
    city: normalized.city,
    postal_code: normalized.postal_code,
    country_code: normalized.country_code,
  }

  if (normalized.address_2) {
    payload.address_2 = normalized.address_2
  }
  if (normalized.company) {
    payload.company = normalized.company
  }
  if (normalized.province) {
    payload.province = normalized.province
  }
  if (normalized.phone) {
    payload.phone = normalized.phone
  }

  return payload
}

const toMedusaCustomerAddressPayload = (
  input: AddressFormData
): MedusaCustomerAddressCreateInput => {
  const payload = toMedusaAddressPayload(input)

  return {
    ...payload,
    metadata: undefined,
  }
}

export const addressToFormData = (
  address?:
    | Partial<HttpTypes.StoreCartAddress>
    | HttpTypes.StoreCustomerAddress
    | null
): AddressFormData => {
  if (!address) {
    return { ...DEFAULT_ADDRESS }
  }

  const normalized = mapMedusaAddressToCheckoutAddress(address)

  return {
    ...DEFAULT_ADDRESS,
    first_name: normalized.firstName ?? "",
    last_name: normalized.lastName ?? "",
    company: normalized.company ?? "",
    address_1: normalized.street ?? "",
    address_2: normalized.street2 ?? "",
    city: normalized.city ?? "",
    province: normalized.province ?? "",
    postal_code: formatPostalCode(normalized.postalCode ?? ""),
    country_code: normalized.country?.toLowerCase() ?? DEFAULT_COUNTRY_CODE,
    phone: formatPhoneNumber(normalized.phone ?? ""),
  }
}

export const cartAddressAdapter: CartAddressAdapter<
  AddressFormData,
  HttpTypes.StoreAddAddress
> = {
  normalize: (input) => normalizeAddressCore(input),
  validate: (input, context) => validateAddressInput(input, context.scope),
  toPayload: (input) => toMedusaAddressPayload(input),
}

export const customerAddressAdapter: CustomerAddressAdapter<
  AddressFormData,
  MedusaCustomerAddressCreateInput,
  CustomerAddressUpdateHookInput,
  MedusaCustomerAddressCreateInput,
  HttpTypes.StoreCustomerAddress
> = {
  normalizeCreate: (input) => normalizeAddressCore(input),
  validateCreate: (input) => validateAddressInput(input, "customer"),
  toCreateParams: (input) => toMedusaCustomerAddressPayload(input),
  normalizeUpdate: (input) => normalizeAddressCore(input),
  validateUpdate: (input) => validateAddressInput(input, "customer"),
  toUpdateParams: (input) => {
    const { addressId: _addressId, ...rest } = input
    return toMedusaCustomerAddressPayload(rest)
  },
}
