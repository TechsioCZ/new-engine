import { storefront } from "./storefront-preset"

type CustomerHooks = typeof storefront.hooks.customers
type UseUpdateCustomerResult = ReturnType<CustomerHooks["useUpdateCustomer"]>

export function useUpdateCustomer(): UseUpdateCustomerResult {
  return storefront.hooks.customers.useUpdateCustomer()
}
