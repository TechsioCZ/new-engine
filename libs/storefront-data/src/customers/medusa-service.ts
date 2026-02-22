import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import { isAuthError } from "../shared/medusa-errors"
import type { CustomerAddressListResponse, CustomerService } from "./types"

const normalizeComparableString = (
  value: unknown,
  lowercase = false
): string | undefined => {
  if (typeof value !== "string") {
    return undefined
  }

  const normalized = value.trim()
  if (!normalized) {
    return undefined
  }

  return lowercase ? normalized.toLowerCase() : normalized
}

const toComparableTimestamp = (value: unknown): number => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? Number.NEGATIVE_INFINITY : value.getTime()
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed
  }

  return Number.NEGATIVE_INFINITY
}

const pickNewestAddress = <T extends HttpTypes.StoreCustomerAddress>(
  addresses: T[]
): T | undefined => {
  if (addresses.length === 0) {
    return undefined
  }

  return [...addresses].sort((left, right) => {
    const rightCreatedAt = toComparableTimestamp(
      (right as Record<string, unknown>).created_at
    )
    const leftCreatedAt = toComparableTimestamp(
      (left as Record<string, unknown>).created_at
    )
    if (rightCreatedAt !== leftCreatedAt) {
      return rightCreatedAt - leftCreatedAt
    }

    const rightUpdatedAt = toComparableTimestamp(
      (right as Record<string, unknown>).updated_at
    )
    const leftUpdatedAt = toComparableTimestamp(
      (left as Record<string, unknown>).updated_at
    )
    return rightUpdatedAt - leftUpdatedAt
  })[0]
}

const addressMatchesCreateInput = (
  address: HttpTypes.StoreCustomerAddress,
  input: MedusaCustomerAddressCreateInput
) => {
  const stringComparisons: Array<{
    key:
      | "first_name"
      | "last_name"
      | "company"
      | "address_1"
      | "address_2"
      | "city"
      | "province"
      | "postal_code"
      | "country_code"
      | "phone"
    lowercase?: boolean
  }> = [
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
      comparison.lowercase
    )
    if (expected === undefined) {
      continue
    }

    const actual = normalizeComparableString(
      address[comparison.key],
      comparison.lowercase
    )
    if (actual !== expected) {
      return false
    }
  }

  const booleanComparisons: Array<"is_default_shipping" | "is_default_billing"> = [
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

export type MedusaCustomerListInput = {
  enabled?: boolean
}

export type MedusaCustomerAddressCreateInput = {
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

export type MedusaCustomerProfileUpdateInput = {
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
export function createMedusaCustomerService(
  sdk: Medusa
): CustomerService<
  HttpTypes.StoreCustomer,
  HttpTypes.StoreCustomerAddress,
  MedusaCustomerListInput,
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
  MedusaCustomerProfileUpdateInput
> {
  return {
    async getAddresses(
      _params: MedusaCustomerListInput,
      signal?: AbortSignal
    ): Promise<CustomerAddressListResponse<HttpTypes.StoreCustomerAddress>> {
      try {
        const response =
          await sdk.client.fetch<HttpTypes.StoreCustomerAddressListResponse>(
            "/store/customers/me/addresses",
            {
              signal,
            }
          )
        return { addresses: response.addresses ?? [] }
      } catch (error) {
        if (isAuthError(error)) {
          return { addresses: [] }
        }
        throw error
      }
    },

    async createAddress(
      params: MedusaCustomerAddressCreateInput
    ): Promise<HttpTypes.StoreCustomerAddress> {
      let existingAddressIds: Set<string> | null = null

      try {
        const existingAddresses = await sdk.store.customer.listAddress()
        existingAddressIds = new Set(
          (existingAddresses.addresses ?? [])
            .map((address) => address.id)
            .filter((id): id is string => Boolean(id))
        )
      } catch {
        // If address listing fails, continue with response-only heuristics.
      }

      const { customer } = await sdk.store.customer.createAddress(params)
      const addresses = customer.addresses ?? []

      if (existingAddressIds) {
        const newlyCreatedAddresses = addresses.filter(
          (address) =>
            typeof address.id === "string" && !existingAddressIds.has(address.id)
        )

        if (newlyCreatedAddresses.length === 1) {
          return newlyCreatedAddresses[0]!
        }

        if (newlyCreatedAddresses.length > 1) {
          const newestCreatedAddress = pickNewestAddress(newlyCreatedAddresses)
          if (newestCreatedAddress) {
            return newestCreatedAddress
          }
        }
      }

      const matchingAddresses = addresses.filter((address) =>
        addressMatchesCreateInput(address, params)
      )
      if (matchingAddresses.length === 1) {
        return matchingAddresses[0]!
      }
      if (matchingAddresses.length > 1) {
        const newestMatchingAddress = pickNewestAddress(matchingAddresses)
        if (newestMatchingAddress) {
          return newestMatchingAddress
        }
      }

      const newestAddress = pickNewestAddress(addresses)
      if (newestAddress) {
        return newestAddress
      }

      if (addresses.length === 0) {
        throw new Error("Failed to create address")
      }

      return addresses[0]!
    },

    async updateAddress(
      addressId: string,
      params: MedusaCustomerAddressUpdateInput
    ): Promise<HttpTypes.StoreCustomerAddress> {
      const { customer } = await sdk.store.customer.updateAddress(
        addressId,
        params
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

    async deleteAddress(addressId: string): Promise<void> {
      await sdk.store.customer.deleteAddress(addressId)
    },

    async updateCustomer(
      params: MedusaCustomerProfileUpdateInput
    ): Promise<HttpTypes.StoreCustomer> {
      const { customer } = await sdk.store.customer.update(params)
      return customer
    },
  }
}
