"use client"

import type { HttpTypes } from "@medusajs/types"
import { createCustomerHooks } from "@techsio/storefront-data/customers/hooks"
import {
  createMedusaCustomerService,
  type MedusaCustomerAddressCreateInput,
  type MedusaCustomerAddressUpdateInput,
  type MedusaCustomerListInput,
  type MedusaCustomerProfileUpdateInput,
} from "@techsio/storefront-data/customers/medusa-service"
import type { CustomerQueryKeys } from "@techsio/storefront-data/customers/types"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"

const customerQueryKeys: CustomerQueryKeys<MedusaCustomerListInput> = {
  all: () => [...queryKeys.all, "customer"] as const,
  profile: () => queryKeys.auth.customer(),
  addresses: (params) => queryKeys.customer.addresses(params),
}

const customerHooks = createCustomerHooks<
  HttpTypes.StoreCustomer,
  HttpTypes.StoreCustomerAddress,
  MedusaCustomerListInput,
  MedusaCustomerListInput,
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput & { addressId?: string },
  MedusaCustomerAddressUpdateInput,
  MedusaCustomerProfileUpdateInput,
  MedusaCustomerProfileUpdateInput
>({
  service: createMedusaCustomerService(sdk),
  queryKeys: customerQueryKeys,
  authQueryKeys: {
    customer: () => queryKeys.auth.customer(),
  },
})

export const {
  useCustomerAddresses: useStorefrontCustomerAddresses,
  useCreateCustomerAddress: useStorefrontCreateCustomerAddress,
  useUpdateCustomerAddress: useStorefrontUpdateCustomerAddress,
  useDeleteCustomerAddress: useStorefrontDeleteCustomerAddress,
  useUpdateCustomer: useStorefrontUpdateCustomerProfile,
} = customerHooks
