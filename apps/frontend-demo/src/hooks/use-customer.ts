import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useStore } from "@tanstack/react-store"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { queryKeys } from "@/lib/query-keys"
import { authStore } from "@/stores/auth-store"
import type { FormAddressData, FormUserData } from "@/types/checkout"
import {
  useStorefrontCreateCustomerAddress,
  useStorefrontCustomerAddresses,
  useStorefrontUpdateCustomerAddress,
  useStorefrontUpdateCustomerProfile,
} from "./storefront-customer"

export function useCustomer() {
  const queryClient = useQueryClient()
  const toast = useToast()
  const user = useStore(authStore, (state) => state.user)
  const isAuthLoading = useStore(authStore, (state) => state.isLoading)

  const {
    addresses,
    isLoading: isLoadingAddresses,
    error,
  } = useStorefrontCustomerAddresses({
    enabled: Boolean(user?.id),
  })

  const mainAddress = addresses[0] as HttpTypes.StoreCustomerAddress | undefined
  const createAddressMutation = useStorefrontCreateCustomerAddress()
  const updateAddressMutation = useStorefrontUpdateCustomerAddress()

  const updateProfileMutation = useStorefrontUpdateCustomerProfile({
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.customer() })

      const previousCustomer = queryClient.getQueryData(
        queryKeys.auth.customer()
      )

      queryClient.setQueryData(
        queryKeys.auth.customer(),
        (old: HttpTypes.StoreCustomer | null) => {
          if (!old) {
            return old
          }

          return {
            ...old,
            first_name: newData.first_name,
            last_name: newData.last_name,
            phone: newData.phone,
            company_name: newData.company_name,
          }
        }
      )

      return { previousCustomer }
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousCustomer) {
        queryClient.setQueryData(
          queryKeys.auth.customer(),
          context.previousCustomer
        )
      }

      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Zkuste to prosim znovu"

      toast.create({
        title: "Chyba pri aktualizaci profilu",
        description: message,
        type: "error",
      })
    },
    onSuccess: () => {
      toast.create({
        title: "Profil byl uspesne aktualizovan",
        type: "success",
      })
    },
  })

  const saveAddressMutation = useMutation({
    mutationFn: async (data: FormAddressData) => {
      const addressInput = {
        address_1: data.street,
        city: data.city,
        postal_code: data.postalCode,
        country_code: (data.country || "cz").toLowerCase(),
      }

      if (mainAddress?.id) {
        return updateAddressMutation.mutateAsync({
          addressId: mainAddress.id,
          ...addressInput,
        })
      }

      return createAddressMutation.mutateAsync(addressInput)
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.customer.addresses(),
      })

      const previousAddresses = queryClient.getQueryData(
        queryKeys.customer.addresses()
      )

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

      return { previousAddresses }
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousAddresses) {
        queryClient.setQueryData(
          queryKeys.customer.addresses(),
          context.previousAddresses
        )
      }

      const message =
        mutationError instanceof Error
          ? mutationError.message
          : "Zkuste to prosim znovu"

      toast.create({
        title: "Chyba pri ukladani adresy",
        description: message,
        type: "error",
      })
    },
    onSuccess: () => {
      toast.create({
        title: "Adresa byla uspesne ulozena",
        type: "success",
      })
    },
  })

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
    isLoading: isAuthLoading || (Boolean(user?.id) && isLoadingAddresses),
    error,
    saveAddress: saveAddressMutation.mutateAsync,
    isSaving:
      saveAddressMutation.isPending ||
      createAddressMutation.isPending ||
      updateAddressMutation.isPending,
    updateProfile: (data: FormUserData) =>
      updateProfileMutation.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        phone: data.phone || undefined,
        company_name: data.company_name || undefined,
      }),
    isUpdating: updateProfileMutation.isPending,
  }
}
