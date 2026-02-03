import type Medusa from "@medusajs/js-sdk"
import type { HttpTypes } from "@medusajs/types"
import type { CustomerAddressListResponse, CustomerService } from "./types"

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
 * import { createCustomerHooks, createMedusaCustomerService } from "@techsio/storefront-data"
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
      _signal?: AbortSignal
    ): Promise<CustomerAddressListResponse<HttpTypes.StoreCustomerAddress>> {
      try {
        const response = await sdk.store.customer.listAddress()
        return { addresses: response.addresses ?? [] }
      } catch {
        return { addresses: [] }
      }
    },

    async createAddress(
      params: MedusaCustomerAddressCreateInput
    ): Promise<HttpTypes.StoreCustomerAddress> {
      const { customer } = await sdk.store.customer.createAddress(params)
      // The response returns the customer with their addresses
      // Find the newly created address (last one) or return a placeholder
      const addresses = customer.addresses ?? []
      const address = addresses.at(-1)
      if (!address) {
        throw new Error("Failed to create address")
      }
      return address
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
