import {
  type CreateAddressData,
  customerHooks,
} from "./customer-hooks-base"

export function useCreateAddress() {
  return customerHooks.useCreateCustomerAddress()
}

type UpdateAddressMutationInput = {
  addressId: string
  data: Partial<CreateAddressData>
}

export function useUpdateAddress() {
  const mutation = customerHooks.useUpdateCustomerAddress()

  return {
    ...mutation,
    mutate: (
      input: UpdateAddressMutationInput,
      options?: Parameters<typeof mutation.mutate>[1]
    ) => mutation.mutate({ addressId: input.addressId, ...input.data }, options),
    mutateAsync: (
      input: UpdateAddressMutationInput,
      options?: Parameters<typeof mutation.mutateAsync>[1]
    ) => mutation.mutateAsync({ addressId: input.addressId, ...input.data }, options),
  }
}

export function useDeleteAddress() {
  const mutation = customerHooks.useDeleteCustomerAddress()

  return {
    ...mutation,
    mutate: (
      addressId: string,
      options?: Parameters<typeof mutation.mutate>[1]
    ) => mutation.mutate({ addressId }, options),
    mutateAsync: (
      addressId: string,
      options?: Parameters<typeof mutation.mutateAsync>[1]
    ) => mutation.mutateAsync({ addressId }, options),
  }
}
