import { storefront } from "./storefront-preset"

const customerHooks = storefront.hooks.customers

export function useUpdateCustomer() {
  return customerHooks.useUpdateCustomer()
}
