import type { StoreCustomer, StoreCustomerAddress } from "@medusajs/types"

import { logError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"

// Export types for reuse in components/hooks
export type { StoreCustomer, StoreCustomerAddress } from "@medusajs/types"

export type CreateAddressData = {
  first_name: string
  last_name: string
  company?: string
  address_1: string
  address_2?: string
  city: string
  province?: string
  postal_code: string
  country_code: string
  phone?: string
}

export async function createAddress(
  data: CreateAddressData
): Promise<StoreCustomerAddress> {
  try {
    const response = await sdk.store.customer.createAddress(data)

    if (!response.customer.addresses) {
      throw new Error("Nepodařilo se vytvořit adresu")
    }

    const newAddress = response.customer.addresses.at(-1)

    if (!newAddress) {
      throw new Error("Nepodařilo se vytvořit adresu")
    }

    return newAddress
  } catch (err) {
    logError("CustomerService.createAddress", err)
    throw new Error("Nepodařilo se vytvořit adresu")
  }
}

export async function updateAddress(
  addressId: string,
  data: Partial<CreateAddressData>
): Promise<StoreCustomerAddress> {
  try {
    const response = await sdk.store.customer.updateAddress(addressId, data)

    if (!response.customer.addresses) {
      throw new Error("Nepodařilo se aktualizovat adresu")
    }

    const updatedAddress = response.customer.addresses.find(
      (addr) => addr.id === addressId
    )

    if (!updatedAddress) {
      throw new Error("Aktualizovaná adresa nenalezena")
    }

    return updatedAddress
  } catch (err) {
    logError("CustomerService.updateAddress", err)
    throw new Error("Nepodařilo se aktualizovat adresu")
  }
}

export async function deleteAddress(addressId: string): Promise<void> {
  try {
    await sdk.store.customer.deleteAddress(addressId)
  } catch (err) {
    logError("CustomerService.deleteAddress", err)
    throw new Error("Nepodařilo se smazat adresu")
  }
}

export type UpdateCustomerData = {
  first_name?: string
  last_name?: string
  phone?: string
  password?: string
  metadata?: Record<string, unknown>
}

export async function updateCustomer(
  data: UpdateCustomerData
): Promise<StoreCustomer> {
  try {
    const response = await sdk.store.customer.update(data)
    return response.customer
  } catch (err) {
    logError("CustomerService.updateCustomer", err)
    throw new Error("Nepodařilo se aktualizovat profil")
  }
}
