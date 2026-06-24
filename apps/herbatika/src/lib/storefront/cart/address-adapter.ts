import type { MedusaAddressLike } from "@techsio/storefront-data/checkout/address"
import {
  type CheckoutAddressInput,
  createCheckoutCartAddressAdapter,
  type MedusaCartAddressPayload,
  mapMedusaAddressToCheckoutAddress,
} from "@techsio/storefront-data/checkout/address"
import type { StorefrontCartAddressAdapter } from "@techsio/storefront-data/shared/address"
import { formatPostalCodeForCountry } from "@/lib/forms/address/postal-code"
import { normalizePhoneNumberToSupportedE164 } from "@/lib/forms/address/phone"
import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form"

const HERBATIKA_ADDRESS_METADATA_FIELDS = [
  ["companyId", "company_id"],
  ["taxId", "tax_id"],
  ["vatId", "vat_id"],
  ["customerNote", "customer_note"],
] as const

export type HerbatikaCheckoutAddressInput = CheckoutAddressInput & {
  companyId?: string | null
  customerNote?: string | null
  metadata?: Record<string, unknown>
  taxId?: string | null
  vatId?: string | null
}

type HerbatikaCheckoutAddressPayload = MedusaCartAddressPayload & {
  metadata?: Record<string, unknown>
}

const baseAddressAdapter =
  createCheckoutCartAddressAdapter<HerbatikaCheckoutAddressInput>()

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const buildHerbatikaAddressMetadata = (
  input: Pick<
    HerbatikaCheckoutAddressInput,
    "companyId" | "customerNote" | "metadata" | "taxId" | "vatId"
  >
) => {
  const metadata = {
    ...(isRecord(input.metadata) ? input.metadata : {}),
  }

  for (const [sourceField, metadataKey] of HERBATIKA_ADDRESS_METADATA_FIELDS) {
    const normalizedValue = normalizeOptionalString(input[sourceField])

    if (normalizedValue) {
      metadata[metadataKey] = normalizedValue
    } else {
      delete metadata[metadataKey]
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const readMetadataString = (
  metadata: Record<string, unknown> | null | undefined,
  key: string
) => normalizeOptionalString(metadata?.[key])

const normalizeAddressPhone = (addressForm: CheckoutAddressValues) =>
  normalizePhoneNumberToSupportedE164(
    addressForm.phone,
    addressForm.countryCode
  ) ??
  addressForm.phone

const normalizeAddressPostalCode = (addressForm: CheckoutAddressValues) =>
  formatPostalCodeForCountry(addressForm.postalCode, addressForm.countryCode) ??
  addressForm.postalCode

export const buildHerbatikaCheckoutAddressInput = (
  addressForm: CheckoutAddressValues
): HerbatikaCheckoutAddressInput => ({
  firstName: addressForm.firstName,
  lastName: addressForm.lastName,
  phone: normalizeAddressPhone(addressForm),
  company: addressForm.company,
  companyId: addressForm.companyId,
  taxId: addressForm.taxId,
  vatId: addressForm.vatId,
  street: addressForm.address1,
  street2: addressForm.address2,
  city: addressForm.city,
  postalCode: normalizeAddressPostalCode(addressForm),
  country: addressForm.countryCode,
  customerNote: addressForm.customerNote,
})

export const mapHerbatikaAddressFormStateFromMedusaAddress = (
  address?: MedusaAddressLike | null
): Partial<CheckoutAddressValues> => {
  const baseAddress =
    mapMedusaAddressToCheckoutAddress<HerbatikaCheckoutAddressInput>(address)
  const metadata = isRecord(address?.metadata) ? address.metadata : undefined

  return {
    firstName: baseAddress.firstName,
    lastName: baseAddress.lastName,
    phone: baseAddress.phone,
    company: baseAddress.company,
    companyId: readMetadataString(metadata, "company_id"),
    taxId: readMetadataString(metadata, "tax_id"),
    vatId: readMetadataString(metadata, "vat_id"),
    address1: baseAddress.street,
    address2: baseAddress.street2,
    city: baseAddress.city,
    postalCode: baseAddress.postalCode,
    countryCode: baseAddress.country?.toUpperCase(),
    customerNote: readMetadataString(metadata, "customer_note"),
  }
}

export const herbatikaCheckoutCartAddressAdapter: StorefrontCartAddressAdapter<
  HerbatikaCheckoutAddressInput,
  HerbatikaCheckoutAddressPayload
> = {
  normalize: baseAddressAdapter.normalize,
  validate: baseAddressAdapter.validate,
  toPayload: (input, context) => {
    const payload = baseAddressAdapter.toPayload?.(input, context) ?? {}
    const metadata = buildHerbatikaAddressMetadata(input)

    return metadata ? { ...payload, metadata } : payload
  },
}
