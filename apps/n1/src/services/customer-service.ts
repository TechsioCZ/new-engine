import type {
  HttpTypes,
  StoreCustomer,
  StoreCustomerAddress,
} from "@medusajs/types"

import { logError } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"

// Export types for reuse in components/hooks
export type { StoreCustomer, StoreCustomerAddress } from "@medusajs/types"

export interface CreateAddressData {
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

export const createAddress = async (
  data: CreateAddressData,
): Promise<StoreCustomerAddress> => {
  try {
    const response = await sdk.store.customer.createAddress(data)

    const newAddress = response.customer.addresses.at(-1)

    if (newAddress === null || newAddress === undefined) {
      throw new Error("Nepodařilo se vytvořit adresu")
    }

    return newAddress
  } catch (error) {
    logError("CustomerService.createAddress", error)
    throw new Error("Nepodařilo se vytvořit adresu", { cause: error })
  }
}

export const updateAddress = async (
  addressId: string,
  data: Partial<CreateAddressData>,
): Promise<StoreCustomerAddress> => {
  try {
    const response = await sdk.store.customer.updateAddress(addressId, data)

    const updatedAddress = response.customer.addresses.find(
      (addr) => addr.id === addressId,
    )

    if (updatedAddress === null || updatedAddress === undefined) {
      throw new Error("Aktualizovaná adresa nenalezena")
    }

    return updatedAddress
  } catch (error) {
    logError("CustomerService.updateAddress", error)
    throw new Error("Nepodařilo se aktualizovat adresu", { cause: error })
  }
}

export const deleteAddress = async (addressId: string): Promise<void> => {
  try {
    await sdk.store.customer.deleteAddress(addressId)
  } catch (error) {
    logError("CustomerService.deleteAddress", error)
    throw new Error("Nepodařilo se smazat adresu", { cause: error })
  }
}

export type UpdateCustomerData = HttpTypes.StoreUpdateCustomer & {
  password?: string
}

export const updateCustomer = async (
  data: UpdateCustomerData,
): Promise<StoreCustomer> => {
  try {
    const response = await sdk.store.customer.update(data)
    return response.customer
  } catch (error) {
    logError("CustomerService.updateCustomer", error)
    throw new Error("Nepodařilo se aktualizovat profil", { cause: error })
  }
}
