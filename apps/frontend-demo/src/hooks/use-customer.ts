import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@techsio/ui-kit/molecules/toast"

import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import type { FormAddressData, FormUserData } from "@/types/checkout"

export function useCustomer() {
  const queryClient = useQueryClient()
  const toast = useToast()

  // Get customer addresses
  const {
    data: addressesResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.customer.addresses(),
    queryFn: async () => {
      try {
        const response = await sdk.store.customer.listAddress()
        return response
      } catch (error) {
        return { addresses: [] }
      }
    },
  })

  // Get the first address as the main address
  const addresses = addressesResponse?.addresses || []
  const mainAddress = addresses[0] as HttpTypes.StoreCustomerAddress | undefined

  // Save address mutation (create or update)
  const saveAddressMutation = useMutation({
    mutationFn: async (data: FormAddressData) => {
      // Map FormAddressData to Medusa API format
      const medusaAddress = {
        address_1: data.street,
        city: data.city,
        postal_code: data.postalCode,
        country_code: data.country,
      }

      if (mainAddress?.id) {
        return await sdk.store.customer.updateAddress(
          mainAddress.id,
          medusaAddress
        )
      }
      return await sdk.store.customer.createAddress(medusaAddress)
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({
        queryKey: queryKeys.customer.addresses(),
      })

      // Snapshot the previous value
      const previousAddresses = queryClient.getQueryData(
        queryKeys.customer.addresses()
      )

      // Optimistically update to the new value
      const optimisticAddress = {
        ...mainAddress,
        address_1: newData.street,
        city: newData.city,
        postal_code: newData.postalCode,
        country_code: newData.country,
      }

      queryClient.setQueryData(
        queryKeys.customer.addresses(),
        (old: { addresses: HttpTypes.StoreCustomerAddress[] } | undefined) => ({
          addresses: old?.addresses?.length
            ? [optimisticAddress, ...old.addresses.slice(1)]
            : [optimisticAddress],
        })
      )

      // Return context with snapshot for rollback
      return { previousAddresses }
    },
    onError: (error: Error, _newData, context) => {
      // Rollback on error
      if (context?.previousAddresses) {
        queryClient.setQueryData(
          queryKeys.customer.addresses(),
          context.previousAddresses
        )
      }
      toast.create({
        title: "Chyba při ukládání adresy",
        description: error?.message || "Zkuste to prosím znovu",
        type: "error",
      })
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
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || null,
        company_name: data.company_name || null,
      }
      const updatedCustomer = await sdk.store.customer.update(updateData)
      return updatedCustomer
    },
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.customer() })
      // Snapshot the previous value
      const previousCustomer = queryClient.getQueryData(
        queryKeys.auth.customer()
      )

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.auth.customer(),
        (old: HttpTypes.StoreCustomer) => ({
          ...old,
          first_name: newData.first_name,
          last_name: newData.last_name,
          phone: newData.phone,
          company_name: newData.company_name,
        })
      )

      // Return context with snapshot
      return { previousCustomer }
    },
    onError: (error: Error, _newData, context) => {
      // Rollback on error
      if (context?.previousCustomer) {
        queryClient.setQueryData(
          queryKeys.auth.customer(),
          context.previousCustomer
        )
      }
      toast.create({
        title: "Chyba při aktualizaci profilu",
        description: error?.message || "Zkuste to prosím znovu",
        type: "error",
      })
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
        street: mainAddress.address_1 || "",
        city: mainAddress.city || "",
        postalCode: mainAddress.postal_code || "",
        country: mainAddress.country_code || "cz",
      }
    : null

  return {
    address: mappedAddress,
    isLoading,
    error,
    saveAddress: saveAddressMutation.mutateAsync,
    isSaving: saveAddressMutation.isPending,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdating: updateProfileMutation.isPending,
  }
}
