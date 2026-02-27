import {
  customerHooks,
  type CustomerUpdateInput,
} from "./customer-hooks-base"

export function useUpdateCustomer() {
  return customerHooks.useUpdateCustomer()
}

export type UpdateCustomerData = CustomerUpdateInput
