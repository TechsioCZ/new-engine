import { omitKeys, omitUndefined } from "@techsio/std/object"
import { isStorefrontMetadata } from "@techsio/storefront-data/cart/types"
import type { StorefrontMetadata } from "@techsio/storefront-data/cart/types"
import {
  createCheckoutCartAddressAdapter,
  mapMedusaAddressToCheckoutAddress,
} from "@techsio/storefront-data/checkout/address"
import type {
  MedusaAddressLike,
  CheckoutAddressInput,
  MedusaCartAddressPayload,
} from "@techsio/storefront-data/checkout/address"
import type { StorefrontCartAddressAdapter } from "@techsio/storefront-data/shared/address"

import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form"

type HerbatikaAddressMetadata = StorefrontMetadata & {
  company_id?: string
  customer_note?: string
  tax_id?: string
  vat_id?: string
}

export type HerbatikaCheckoutAddressInput =
  CheckoutAddressInput<HerbatikaAddressMetadata> & {
    companyId?: string | null
    customerNote?: string | null
    taxId?: string | null
    vatId?: string | null
  }

export type HerbatikaCheckoutAddressPayload = MedusaCartAddressPayload & {
  metadata?: HerbatikaAddressMetadata
}

const baseAddressAdapter =
  createCheckoutCartAddressAdapter<HerbatikaCheckoutAddressInput>()

const normalizeOptionalString = (value: unknown) => {
  let normalizedValue: string | undefined

  if (typeof value === "string") {
    const trimmed = value.trim()
    normalizedValue = trimmed.length > 0 ? trimmed : undefined
  }

  return normalizedValue
}

const buildHerbatikaAddressMetadata = (
  input: Pick<
    HerbatikaCheckoutAddressInput,
    "companyId" | "customerNote" | "metadata" | "taxId" | "vatId"
  >,
): HerbatikaAddressMetadata | undefined => {
  const companyId = normalizeOptionalString(input.companyId)
  const customerNote = normalizeOptionalString(input.customerNote)
  const taxId = normalizeOptionalString(input.taxId)
  const vatId = normalizeOptionalString(input.vatId)
  const existingMetadata = omitKeys(input.metadata ?? {}, [
    "company_id",
    "customer_note",
    "tax_id",
    "vat_id",
  ])
  const metadata: HerbatikaAddressMetadata = {
    ...existingMetadata,
    ...(companyId === undefined ? {} : { company_id: companyId }),
    ...(customerNote === undefined ? {} : { customer_note: customerNote }),
    ...(taxId === undefined ? {} : { tax_id: taxId }),
    ...(vatId === undefined ? {} : { vat_id: vatId }),
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

const readHerbatikaAddressMetadata = (
  value: unknown,
): StorefrontMetadata | undefined =>
  isStorefrontMetadata(value) ? value : undefined

const readMetadataString = (
  metadata: HerbatikaAddressMetadata | undefined,
  key: string,
) =>
  normalizeOptionalString(
    metadata === undefined ? undefined : Reflect.get(metadata, key),
  )

export const buildHerbatikaCheckoutAddressInput = (
  addressForm: CheckoutAddressValues,
): HerbatikaCheckoutAddressInput => ({
  city: addressForm.city,
  company: addressForm.company,
  companyId: addressForm.companyId,
  country: addressForm.countryCode,
  customerNote: addressForm.customerNote,
  firstName: addressForm.firstName,
  lastName: addressForm.lastName,
  phone: addressForm.phone,
  postalCode: addressForm.postalCode,
  street: addressForm.address1,
  street2: addressForm.address2,
  taxId: addressForm.taxId,
  vatId: addressForm.vatId,
})

export const mapHerbatikaAddressFormStateFromMedusaAddress = (
  address?: MedusaAddressLike | null,
): Partial<CheckoutAddressValues> => {
  const baseAddress = mapMedusaAddressToCheckoutAddress(address)
  const metadata = readHerbatikaAddressMetadata(address?.metadata)

  const values = {
    address1: baseAddress.street,
    address2: baseAddress.street2,
    city: baseAddress.city,
    company: baseAddress.company,
    companyId: readMetadataString(metadata, "company_id"),
    countryCode: baseAddress.country?.toUpperCase(),
    customerNote: readMetadataString(metadata, "customer_note"),
    firstName: baseAddress.firstName,
    lastName: baseAddress.lastName,
    phone: baseAddress.phone,
    postalCode: baseAddress.postalCode,
    taxId: readMetadataString(metadata, "tax_id"),
    vatId: readMetadataString(metadata, "vat_id"),
  }

  return omitUndefined(values)
}

export const herbatikaCheckoutCartAddressAdapter: StorefrontCartAddressAdapter<
  HerbatikaCheckoutAddressInput,
  HerbatikaCheckoutAddressPayload
> = {
  ...(baseAddressAdapter.normalize === undefined
    ? {}
    : { normalize: baseAddressAdapter.normalize }),
  ...(baseAddressAdapter.validate === undefined
    ? {}
    : { validate: baseAddressAdapter.validate }),
  toPayload: (input, context) => {
    const payload = baseAddressAdapter.toPayload?.(input, context) ?? {}
    const metadata = buildHerbatikaAddressMetadata(input)

    return metadata ? { ...payload, metadata } : payload
  },
}
