import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { getRecordValue, isRecord } from "@techsio/std/object"

import { toComparableTimestamp } from "../shared/date-utils"
import { isAuthError } from "../shared/medusa-errors"
import { decodeStorefrontMetadata } from "../shared/metadata"
import type { StorefrontMetadata } from "../shared/metadata"
import type {
  CustomerAddressAdapter,
  CustomerAddressListResponse,
  CustomerService,
} from "./types"

const normalizeComparableString = (
  value: unknown,
  lowercase = false,
): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  if (normalized.length === 0) {
    return undefined
  }

  return lowercase ? normalized.toLowerCase() : normalized
}

const pickNewestAddress = <T extends HttpTypes.StoreCustomerAddress>(
  addresses: T[],
): T | undefined => {
  let newest: T | undefined
  for (const candidate of addresses) {
    if (newest === undefined) {
      newest = candidate
    } else {
      const candidateCreatedAt = toComparableTimestamp(candidate.created_at)
      const newestCreatedAt = toComparableTimestamp(newest.created_at)
      if (
        candidateCreatedAt > newestCreatedAt ||
        (candidateCreatedAt === newestCreatedAt &&
          toComparableTimestamp(candidate.updated_at) >
            toComparableTimestamp(newest.updated_at))
      ) {
        newest = candidate
      }
    }
  }
  return newest
}

const addressMatchesCreateInput = (
  address: HttpTypes.StoreCustomerAddress,
  input: MedusaCustomerAddressCreateInput,
) => {
  const stringComparisons: {
    key: Extract<
      keyof MedusaCustomerAddressCreateInput,
      keyof HttpTypes.StoreCustomerAddress
    >
    lowercase?: boolean
  }[] = [
    { key: "first_name" },
    { key: "last_name" },
    { key: "company" },
    { key: "address_1" },
    { key: "address_2" },
    { key: "city" },
    { key: "province" },
    { key: "postal_code" },
    { key: "country_code", lowercase: true },
    { key: "phone" },
  ]

  for (const comparison of stringComparisons) {
    const expected = normalizeComparableString(
      input[comparison.key],
      comparison.lowercase,
    )
    if (expected === undefined) {
      continue
    }

    const actual = normalizeComparableString(
      address[comparison.key],
      comparison.lowercase,
    )
    if (actual !== expected) {
      return false
    }
  }

  const booleanComparisons: ("is_default_shipping" | "is_default_billing")[] = [
    "is_default_shipping",
    "is_default_billing",
  ]

  for (const key of booleanComparisons) {
    const expected = input[key]
    if (typeof expected !== "boolean") {
      continue
    }

    const actual = address[key]
    if (actual !== expected) {
      return false
    }
  }

  return true
}

const getAddressIdSet = (
  addresses: HttpTypes.StoreCustomerAddress[],
): Set<string> =>
  new Set(
    addresses
      .map((address) => address.id)
      .filter((id): id is string => Boolean(id)),
  )

const pickSingleOrNewestAddress = (
  addresses: HttpTypes.StoreCustomerAddress[],
): HttpTypes.StoreCustomerAddress | undefined => {
  if (addresses.length === 1) {
    return addresses[0]
  }
  if (addresses.length > 1) {
    return pickNewestAddress(addresses)
  }
  return undefined
}

const getNewlyCreatedAddresses = (
  addresses: HttpTypes.StoreCustomerAddress[],
  existingAddressIds: Set<string>,
): HttpTypes.StoreCustomerAddress[] =>
  addresses.filter(
    (address) =>
      typeof address.id === "string" && !existingAddressIds.has(address.id),
  )

const resolveCreatedAddress = (
  addresses: HttpTypes.StoreCustomerAddress[],
  params: MedusaCustomerAddressCreateInput,
  existingAddressIds: Set<string> | null,
): HttpTypes.StoreCustomerAddress | undefined => {
  if (existingAddressIds !== null) {
    const newlyCreatedAddress = pickSingleOrNewestAddress(
      getNewlyCreatedAddresses(addresses, existingAddressIds),
    )
    if (newlyCreatedAddress !== undefined) {
      return newlyCreatedAddress
    }
  }

  const matchingAddress = pickSingleOrNewestAddress(
    addresses.filter((address) => addressMatchesCreateInput(address, params)),
  )
  if (matchingAddress !== undefined) {
    return matchingAddress
  }

  return pickNewestAddress(addresses)
}

export interface MedusaCustomerListInput {
  enabled?: boolean
}

export interface MedusaCustomerAddressCreateInput<
  TMetadata extends object = object,
> {
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  postal_code?: string | null
  country_code?: string | null
  phone?: string | null
  is_default_shipping?: boolean
  is_default_billing?: boolean
  address_name?: string | null
  metadata?: TMetadata | null
}

export type MedusaCustomerAddressUpdateInput<
  TMetadata extends object = object,
> = MedusaCustomerAddressCreateInput<TMetadata>

const decodeCustomerMetadata = (
  metadata: unknown,
): StorefrontMetadata | null | undefined =>
  metadata === undefined || metadata === null
    ? metadata
    : decodeStorefrontMetadata(metadata, "Customer metadata")

const buildStoreCustomerAddressBody = <TMetadata extends object>(
  params: MedusaCustomerAddressCreateInput<TMetadata>,
): HttpTypes.StoreCreateCustomerAddress => {
  const { metadata, ...address } = params
  return metadata === undefined
    ? address
    : { ...address, metadata: decodeCustomerMetadata(metadata) ?? null }
}

const buildStoreCustomerUpdateBody = <TMetadata extends object>(
  params: MedusaCustomerProfileUpdateInput<TMetadata>,
): HttpTypes.StoreUpdateCustomer => {
  const { metadata, ...profile } = params
  return metadata === undefined
    ? profile
    : { ...profile, metadata: decodeCustomerMetadata(metadata) ?? null }
}

const decodeOptionalCustomerAddressString = (
  value: object,
  field: string,
): string | null | undefined => {
  const entry = getRecordValue(value, field)
  if (entry !== undefined && entry !== null && typeof entry !== "string") {
    throw new TypeError(`Customer address ${field} must be a string or null`)
  }
  return entry
}

const decodeOptionalCustomerAddressBoolean = (
  value: object,
  field: string,
): boolean | undefined => {
  const entry = getRecordValue(value, field)
  if (entry !== undefined && typeof entry !== "boolean") {
    throw new TypeError(`Customer address ${field} must be boolean`)
  }
  return entry
}

const decodeOptionalCustomerAddressMetadata = (
  value: object,
): StorefrontMetadata | null | undefined => {
  const metadata = getRecordValue(value, "metadata")
  return metadata === undefined || metadata === null
    ? metadata
    : decodeStorefrontMetadata(metadata, "Customer address metadata")
}

const buildMedusaCustomerAddressInput = (
  value: unknown,
): MedusaCustomerAddressCreateInput => {
  if (!isRecord(value)) {
    throw new TypeError("Customer address input must be an object")
  }

  const address1 = decodeOptionalCustomerAddressString(value, "address_1")
  const address2 = decodeOptionalCustomerAddressString(value, "address_2")
  const addressName = decodeOptionalCustomerAddressString(value, "address_name")
  const city = decodeOptionalCustomerAddressString(value, "city")
  const company = decodeOptionalCustomerAddressString(value, "company")
  const countryCode = decodeOptionalCustomerAddressString(value, "country_code")
  const firstName = decodeOptionalCustomerAddressString(value, "first_name")
  const isDefaultBilling = decodeOptionalCustomerAddressBoolean(
    value,
    "is_default_billing",
  )
  const isDefaultShipping = decodeOptionalCustomerAddressBoolean(
    value,
    "is_default_shipping",
  )
  const lastName = decodeOptionalCustomerAddressString(value, "last_name")
  const metadata = decodeOptionalCustomerAddressMetadata(value)
  const phone = decodeOptionalCustomerAddressString(value, "phone")
  const postalCode = decodeOptionalCustomerAddressString(value, "postal_code")
  const province = decodeOptionalCustomerAddressString(value, "province")

  return {
    ...(address1 === undefined ? {} : { address_1: address1 }),
    ...(address2 === undefined ? {} : { address_2: address2 }),
    ...(addressName === undefined ? {} : { address_name: addressName }),
    ...(city === undefined ? {} : { city }),
    ...(company === undefined ? {} : { company }),
    ...(countryCode === undefined ? {} : { country_code: countryCode }),
    ...(firstName === undefined ? {} : { first_name: firstName }),
    ...(isDefaultBilling === undefined
      ? {}
      : { is_default_billing: isDefaultBilling }),
    ...(isDefaultShipping === undefined
      ? {}
      : { is_default_shipping: isDefaultShipping }),
    ...(lastName === undefined ? {} : { last_name: lastName }),
    ...(metadata === undefined ? {} : { metadata }),
    ...(phone === undefined ? {} : { phone }),
    ...(postalCode === undefined ? {} : { postal_code: postalCode }),
    ...(province === undefined ? {} : { province }),
  }
}

export const decodeMedusaCustomerAddressInput = (
  value: unknown,
): MedusaCustomerAddressCreateInput => buildMedusaCustomerAddressInput(value)

export const medusaCustomerAddressAdapter: CustomerAddressAdapter<
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressCreateInput & { addressId?: string },
  MedusaCustomerAddressUpdateInput
> = {
  toCreateParams: (input) => input,
  toUpdateParams: ({ addressId: _addressId, ...input }) => input,
}

export interface MedusaCustomerProfileUpdateInput<
  TMetadata extends object = object,
> {
  first_name?: string | null
  last_name?: string | null
  phone?: string | null
  company_name?: string | null
  metadata?: TMetadata | null
}

/**
 * Creates a CustomerService for Medusa SDK
 *
 * @example
 * ```typescript
 * import { createCustomerHooks } from "@techsio/storefront-data/customers/hooks"
 * import { createMedusaCustomerService } from "@techsio/storefront-data/customers/medusa-service"
 * import { sdk } from "@/lib/medusa-client"
 *
 * const customerHooks = createCustomerHooks({
 *   service: createMedusaCustomerService(sdk),
 *   queryKeys: customerQueryKeys,
 * })
 * ```
 */
export const createMedusaCustomerService = (
  sdk: Medusa,
): CustomerService<
  HttpTypes.StoreCustomer,
  HttpTypes.StoreCustomerAddress,
  MedusaCustomerListInput,
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
  MedusaCustomerProfileUpdateInput
> => {
  const pageSize = 100
  const maxAddressPages = 100

  const fetchCustomerAddressPage = async (
    offset: number,
    pageIndex: number,
  ): Promise<HttpTypes.StoreCustomerAddress[]> => {
    if (pageIndex >= maxAddressPages) {
      throw new Error(
        `Customer address pagination exceeded ${maxAddressPages} pages`,
      )
    }

    const response = await sdk.store.customer.listAddress({
      limit: pageSize,
      offset,
    })
    const page = response.addresses ?? []
    const nextOffset = offset + page.length
    const reachedReportedCount =
      typeof response.count === "number" && nextOffset >= response.count
    const reachedUnreportedEnd =
      typeof response.count !== "number" && page.length < pageSize

    if (page.length === 0 || reachedReportedCount || reachedUnreportedEnd) {
      return page
    }

    return [
      ...page,
      ...(await fetchCustomerAddressPage(nextOffset, pageIndex + 1)),
    ]
  }

  const fetchAllCustomerAddresses = async () =>
    await fetchCustomerAddressPage(0, 0)

  return {
    async createAddress(
      params: MedusaCustomerAddressCreateInput,
    ): Promise<HttpTypes.StoreCustomerAddress> {
      let existingAddressIds: Set<string> | null = null

      try {
        existingAddressIds = getAddressIdSet(await fetchAllCustomerAddresses())
      } catch {
        // If address listing fails, continue with response-only heuristics.
      }

      const { customer } = await sdk.store.customer.createAddress(
        buildStoreCustomerAddressBody(params),
      )
      const addresses = customer.addresses ?? []
      const createdAddress = resolveCreatedAddress(
        addresses,
        params,
        existingAddressIds,
      )
      if (createdAddress !== undefined) {
        return createdAddress
      }

      throw new Error("Failed to create address")
    },

    async deleteAddress(addressId: string): Promise<void> {
      await sdk.store.customer.deleteAddress(addressId)
    },

    async getAddresses(
      _params: MedusaCustomerListInput,
      signal?: AbortSignal,
    ): Promise<CustomerAddressListResponse<HttpTypes.StoreCustomerAddress>> {
      try {
        const response =
          await sdk.client.fetch<HttpTypes.StoreCustomerAddressListResponse>(
            "/store/customers/me/addresses",
            {
              signal: signal ?? null,
            },
          )
        return { addresses: response.addresses ?? [] }
      } catch (error) {
        if (isAuthError(error)) {
          return { addresses: [] }
        }
        throw error
      }
    },

    async updateAddress(
      addressId: string,
      params: MedusaCustomerAddressUpdateInput,
    ): Promise<HttpTypes.StoreCustomerAddress> {
      const { customer } = await sdk.store.customer.updateAddress(
        addressId,
        buildStoreCustomerAddressBody(params),
      )
      // The response returns the customer with their addresses
      // Find the updated address by ID
      const addresses = customer.addresses ?? []
      const address = addresses.find((a) => a.id === addressId)
      if (!address) {
        throw new Error("Failed to update address")
      }
      return address
    },

    async updateCustomer(
      params: MedusaCustomerProfileUpdateInput,
    ): Promise<HttpTypes.StoreCustomer> {
      const { customer } = await sdk.store.customer.update(
        buildStoreCustomerUpdateBody(params),
      )
      return customer
    },
  }
}
