import type { MedusaAddressLike } from "@techsio/storefront-data/checkout/address"
import {
  type CheckoutAddressInput,
  createCheckoutCartAddressAdapter,
  type MedusaCartAddressPayload,
  mapMedusaAddressToCheckoutAddress,
} from "@techsio/storefront-data/checkout/address"
import type { StorefrontCartAddressAdapter } from "@techsio/storefront-data/shared/address"
import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form"

const HERBATICA_ADDRESS_METADATA_FIELDS = [
  ["companyId", "company_id"],
  ["taxId", "tax_id"],
  ["vatId", "vat_id"],
  ["customerNote", "customer_note"],
] as const

export type HerbaticaCheckoutAddressInput = CheckoutAddressInput & {
  companyId?: string | null
  customerNote?: string | null
  metadata?: Record<string, unknown>
  taxId?: string | null
  vatId?: string | null
}

type HerbaticaCheckoutAddressPayload = MedusaCartAddressPayload & {
  metadata?: Record<string, unknown>
}

const baseAddressAdapter =
  createCheckoutCartAddressAdapter<HerbaticaCheckoutAddressInput>()

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const buildHerbaticaAddressMetadata = (
  input: Pick<
    HerbaticaCheckoutAddressInput,
    "companyId" | "customerNote" | "metadata" | "taxId" | "vatId"
  >
) => {
  const metadata = {
    ...(isRecord(input.metadata) ? input.metadata : {}),
  }

  for (const [sourceField, metadataKey] of HERBATICA_ADDRESS_METADATA_FIELDS) {
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

export const buildHerbaticaCheckoutAddressInput = (
  addressForm: CheckoutAddressValues
): HerbaticaCheckoutAddressInput => ({
  firstName: addressForm.firstName,
  lastName: addressForm.lastName,
  phone: addressForm.phone,
  company: addressForm.company,
  companyId: addressForm.companyId,
  taxId: addressForm.taxId,
  vatId: addressForm.vatId,
  street: addressForm.address1,
  street2: addressForm.address2,
  city: addressForm.city,
  postalCode: addressForm.postalCode,
  country: addressForm.countryCode,
  customerNote: addressForm.customerNote,
})

export const mapHerbaticaAddressFormStateFromMedusaAddress = (
  address?: MedusaAddressLike | null
): Partial<CheckoutAddressValues> => {
  const baseAddress =
    mapMedusaAddressToCheckoutAddress<HerbaticaCheckoutAddressInput>(address)
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

export const herbaticaCheckoutCartAddressAdapter: StorefrontCartAddressAdapter<
  HerbaticaCheckoutAddressInput,
  HerbaticaCheckoutAddressPayload
> = {
  normalize: baseAddressAdapter.normalize,
  validate: baseAddressAdapter.validate,
  toPayload: (input, context) => {
    const payload = baseAddressAdapter.toPayload?.(input, context) ?? {}
    const metadata = buildHerbaticaAddressMetadata(input)

    return metadata ? { ...payload, metadata } : payload
  },
}
