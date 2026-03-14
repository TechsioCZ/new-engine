import { storefront } from "./storefront-preset"

const customerHooks = storefront.hooks.customers

export function useCreateAddress() {
  return customerHooks.useCreateCustomerAddress()
}

export function useUpdateAddress() {
  return customerHooks.useUpdateCustomerAddress()
}

export function useDeleteAddress() {
  return customerHooks.useDeleteCustomerAddress()
}
