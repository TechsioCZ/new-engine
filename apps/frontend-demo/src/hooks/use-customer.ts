import type { HttpTypes } from "@medusajs/types"
import { useToast } from "@techsio/ui-kit/molecules/toast"
import { storefront } from "@/lib/storefront"
import type { FormAddressData, FormUserData } from "@/types/checkout"

const toCustomerAddressInput = (data: FormAddressData) => ({
  address_1: data.street,
  city: data.city,
  postal_code: data.postalCode,
  country_code: data.country.toLowerCase(),
})

const toCustomerProfileInput = (data: FormUserData) => ({
  first_name: data.first_name,
  last_name: data.last_name,
  phone: data.phone || undefined,
  company_name: data.company_name || undefined,
})

const toFormAddress = (
  address?: HttpTypes.StoreCustomerAddress
): FormAddressData | null =>
  address
    ? {
        street: address.address_1 || "",
        city: address.city || "",
        postalCode: address.postal_code || "",
        country: address.country_code || "cz",
      }
    : null

export function useCustomer() {
  const toast = useToast()
  const {
    addresses,
    isLoading,
    error: addressesError,
  } = storefront.hooks.customers.useCustomerAddresses({})

  const mainAddress = addresses[0]

  const createAddressMutation =
    storefront.hooks.customers.useCreateCustomerAddress({
      onError: (mutationError) => {
        toast.create({
          title: "Chyba při ukládání adresy",
          description:
            mutationError instanceof Error
              ? mutationError.message
              : "Zkuste to prosím znovu",
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

  const updateAddressMutation =
    storefront.hooks.customers.useUpdateCustomerAddress({
      onError: (mutationError) => {
        toast.create({
          title: "Chyba při ukládání adresy",
          description:
            mutationError instanceof Error
              ? mutationError.message
              : "Zkuste to prosím znovu",
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

  const updateProfileMutation = storefront.hooks.customers.useUpdateCustomer({
    onError: (mutationError) => {
      toast.create({
        title: "Chyba při aktualizaci profilu",
        description:
          mutationError instanceof Error
            ? mutationError.message
            : "Zkuste to prosím znovu",
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

  return {
    address: toFormAddress(mainAddress),
    isLoading,
    error: addressesError,
    saveAddress: (data: FormAddressData) => {
      const addressInput = toCustomerAddressInput(data)

      if (mainAddress?.id) {
        return updateAddressMutation.mutateAsync({
          addressId: mainAddress.id,
          ...addressInput,
        })
      }

      return createAddressMutation.mutateAsync(addressInput)
    },
    isSaving:
      createAddressMutation.isPending || updateAddressMutation.isPending,
    updateProfile: (data: FormUserData) =>
      updateProfileMutation.mutateAsync(toCustomerProfileInput(data)),
    isUpdating: updateProfileMutation.isPending,
  }
}
