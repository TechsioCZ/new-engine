import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"

import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import type { FormAddressData, FormUserData } from "@/types/checkout"

interface AddressesQueryData {
  addresses: HttpTypes.StoreCustomerAddress[]
}

interface SaveAddressContext {
  previousAddresses: AddressesQueryData | undefined
}

interface UpdateProfileContext {
  previousCustomer: HttpTypes.StoreCustomer | undefined
}

export const useCustomer = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  // Get customer addresses
  const {
    data: addressesResponse,
    isLoading,
    error,
  } = useQuery({
    queryFn: async () => {
      try {
        const response = await sdk.store.customer.listAddress()
        return response
      } catch {
        return { addresses: [] }
      }
    },
    queryKey: queryKeys.customer.addresses(),
  })

  // Get the first address as the main address
  const addresses = addressesResponse?.addresses ?? []
  const mainAddress = addresses.at(0)

  // Save address mutation (create or update)
  const saveAddressMutation = useMutation({
    mutationFn: async (data: FormAddressData) => {
      // Map FormAddressData to Medusa API format
      const medusaAddress = {
        address_1: data.street,
        city: data.city,
        country_code: data.country,
        postal_code: data.postalCode,
      }

      if (mainAddress?.id !== undefined && mainAddress.id.length > 0) {
        return await sdk.store.customer.updateAddress(
          mainAddress.id,
          medusaAddress,
        )
      }
      return await sdk.store.customer.createAddress(medusaAddress)
    },
    onError: (
      mutationError: Error,
      _newData: FormAddressData,
      context: SaveAddressContext | undefined,
    ) => {
      // Rollback on error
      if (context?.previousAddresses !== undefined) {
        queryClient.setQueryData(
          queryKeys.customer.addresses(),
          context.previousAddresses,
        )
      }
      toast.create({
        description:
          mutationError.message.length > 0
            ? mutationError.message
            : "Zkuste to prosím znovu",
        title: "Chyba při ukládání adresy",
        type: "error",
      })
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.customer.addresses(),
      })

      // Snapshot the previous value
      const previousAddresses = queryClient.getQueryData<AddressesQueryData>(
        queryKeys.customer.addresses(),
      )

      // Optimistically update to the new value
      const optimisticAddress = {
        ...mainAddress,
        address_1: newData.street,
        city: newData.city,
        country_code: newData.country,
        postal_code: newData.postalCode,
      }

      queryClient.setQueryData(
        queryKeys.customer.addresses(),
        (old: { addresses: HttpTypes.StoreCustomerAddress[] } | undefined) => ({
          addresses:
            old !== undefined && old.addresses.length > 0
              ? [optimisticAddress, ...old.addresses.slice(1)]
              : [optimisticAddress],
        }),
      )

      // Return context with snapshot for rollback
      return { previousAddresses }
    },
    onSuccess: () => {
      toast.create({
        title: "Adresa byla úspěšně uložena",
        type: "success",
      })
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: async (data: FormUserData) => {
      // Map FormUserData to Medusa API format - only send fields that can be updated
      const updateData = {
        company_name: data.company_name.length > 0 ? data.company_name : null,
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone.length > 0 ? data.phone : null,
      }
      const updatedCustomer = await sdk.store.customer.update(updateData)
      return updatedCustomer
    },
    onError: (
      mutationError: Error,
      _newData: FormUserData,
      context: UpdateProfileContext | undefined,
    ) => {
      // Rollback on error
      if (context?.previousCustomer !== undefined) {
        queryClient.setQueryData(
          queryKeys.auth.customer(),
          context.previousCustomer,
        )
      }
      toast.create({
        description:
          mutationError.message.length > 0
            ? mutationError.message
            : "Zkuste to prosím znovu",
        title: "Chyba při aktualizaci profilu",
        type: "error",
      })
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.customer() })
      // Snapshot the previous value
      const previousCustomer =
        queryClient.getQueryData<HttpTypes.StoreCustomer>(
          queryKeys.auth.customer(),
        )

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.auth.customer(),
        (old: HttpTypes.StoreCustomer) => ({
          ...old,
          company_name: newData.company_name,
          first_name: newData.first_name,
          last_name: newData.last_name,
          phone: newData.phone,
        }),
      )

      // Return context with snapshot
      return { previousCustomer }
    },
    onSuccess: () => {
      toast.create({
        title: "Profil byl úspěšně aktualizován",
        type: "success",
      })
    },
  })

  // Map the Medusa address to FormAddressData format
  const mappedAddress: FormAddressData | null = mainAddress
    ? {
        city: mainAddress.city ?? "",
        country: mainAddress.country_code ?? "cz",
        postalCode: mainAddress.postal_code ?? "",
        street: mainAddress.address_1 ?? "",
      }
    : null

  return {
    address: mappedAddress,
    error,
    isLoading,
    isSaving: saveAddressMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    saveAddress: saveAddressMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
  }
}
