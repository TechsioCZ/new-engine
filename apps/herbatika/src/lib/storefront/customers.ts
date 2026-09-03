"use client"

import type {
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
  MedusaCustomerProfileUpdateInput,
} from "@techsio/storefront-data/customers/medusa-service"
import { storefront } from "./storefront"

export type CustomerAddressCreateInput = MedusaCustomerAddressCreateInput
export type CustomerAddressUpdateInput = MedusaCustomerAddressUpdateInput & {
  addressId: string
}
export type CustomerProfileUpdateInput = MedusaCustomerProfileUpdateInput

export const {
  useCreateCustomerAddress,
  useCustomerAddresses,
  useDeleteCustomerAddress,
  useUpdateCustomer,
  useUpdateCustomerAddress,
} = storefront.hooks.customers
