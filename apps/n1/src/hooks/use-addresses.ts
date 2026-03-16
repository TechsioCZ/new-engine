import { storefront } from "./storefront-preset"

type CustomerHooks = typeof storefront.hooks.customers
type UseCreateAddressResult = ReturnType<
  CustomerHooks["useCreateCustomerAddress"]
>
type UseUpdateAddressResult = ReturnType<
  CustomerHooks["useUpdateCustomerAddress"]
>
type UseDeleteAddressResult = ReturnType<
  CustomerHooks["useDeleteCustomerAddress"]
>

export function useCreateAddress(): UseCreateAddressResult {
  return storefront.hooks.customers.useCreateCustomerAddress()
}

export function useUpdateAddress(): UseUpdateAddressResult {
  return storefront.hooks.customers.useUpdateCustomerAddress()
}

export function useDeleteAddress(): UseDeleteAddressResult {
  return storefront.hooks.customers.useDeleteCustomerAddress()
}
