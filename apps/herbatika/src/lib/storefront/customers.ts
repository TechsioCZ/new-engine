"use client";

import type {
  MedusaCustomerAddressCreateInput,
  MedusaCustomerAddressUpdateInput,
  MedusaCustomerListInput,
  MedusaCustomerProfileUpdateInput,
} from "@techsio/storefront-data/customers/medusa-service";
import { storefront } from "./storefront";

export type CustomerAddressListInput = MedusaCustomerListInput & {
  enabled?: boolean;
};

export type CustomerAddressCreateInput = MedusaCustomerAddressCreateInput;

export type CustomerAddressUpdateInput = MedusaCustomerAddressUpdateInput & {
  addressId?: string;
};

export type CustomerProfileUpdateInput = MedusaCustomerProfileUpdateInput;

const customerHooks = storefront.hooks.customers;

export const {
  useCustomerAddresses,
  useSuspenseCustomerAddresses,
  useCreateCustomerAddress,
  useUpdateCustomerAddress,
  useDeleteCustomerAddress,
  useUpdateCustomer,
} = customerHooks;
