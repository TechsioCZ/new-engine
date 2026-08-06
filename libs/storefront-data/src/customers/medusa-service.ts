import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"

import { toComparableTimestamp } from "../shared/date-utils"
import { isAuthError } from "../shared/medusa-errors"
import type { CustomerAddressListResponse, CustomerService } from "./types"

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

export interface MedusaCustomerAddressCreateInput {
  first_name?: string
  last_name?: string
  company?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
  country_code?: string
  phone?: string
  is_default_shipping?: boolean
  is_default_billing?: boolean
  metadata?: Record<string, unknown>
}

export type MedusaCustomerAddressUpdateInput = MedusaCustomerAddressCreateInput

export interface MedusaCustomerProfileUpdateInput {
  first_name?: string
  last_name?: string
  phone?: string
  company_name?: string
  metadata?: Record<string, unknown>
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

      const { customer } = await sdk.store.customer.createAddress(params)
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
        params,
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
      const { customer } = await sdk.store.customer.update(params)
      return customer
    },
  }
}
