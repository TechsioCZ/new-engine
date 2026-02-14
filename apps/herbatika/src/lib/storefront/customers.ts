"use client";

import type { HttpTypes } from "@medusajs/types";
import {
  createCustomerHooks,
  createMedusaCustomerService,
  type MedusaCustomerAddressCreateInput,
  type MedusaCustomerAddressUpdateInput,
  type MedusaCustomerListInput,
  type MedusaCustomerProfileUpdateInput,
} from "@techsio/storefront-data";
import { storefrontCacheConfig } from "./cache";
import { STOREFRONT_QUERY_KEY_NAMESPACE } from "./query-keys";
import { storefrontSdk } from "./sdk";

type CustomerAddressListInput = MedusaCustomerListInput & {
  enabled?: boolean;
};

type CustomerAddressCreateInput = MedusaCustomerAddressCreateInput;
type CustomerAddressUpdateInput = MedusaCustomerAddressUpdateInput & {
  addressId?: string;
};
type CustomerProfileUpdateInput = MedusaCustomerProfileUpdateInput;

export const customerService = createMedusaCustomerService(storefrontSdk);

export const customerHooks = createCustomerHooks<
  HttpTypes.StoreCustomer,
  HttpTypes.StoreCustomerAddress,
  CustomerAddressListInput,
  MedusaCustomerListInput,
  CustomerAddressCreateInput,
  MedusaCustomerAddressCreateInput,
  CustomerAddressUpdateInput,
  MedusaCustomerAddressUpdateInput,
  CustomerProfileUpdateInput,
  MedusaCustomerProfileUpdateInput
>({
  service: customerService,
  queryKeyNamespace: STOREFRONT_QUERY_KEY_NAMESPACE,
  cacheConfig: storefrontCacheConfig,
  buildListParams: (input) => input,
  buildCreateParams: (input) => input,
  buildUpdateParams: (input) => input,
  buildUpdateCustomerParams: (input) => input,
});

export const {
  useCustomerAddresses,
  useSuspenseCustomerAddresses,
  useCreateCustomerAddress,
  useUpdateCustomerAddress,
  useDeleteCustomerAddress,
  useUpdateCustomer,
} = customerHooks;

export type {
  CustomerAddressListInput,
  CustomerAddressCreateInput,
  CustomerAddressUpdateInput,
  CustomerProfileUpdateInput,
};
