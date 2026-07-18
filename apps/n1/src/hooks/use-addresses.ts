import { useMutation, useQueryClient } from "@tanstack/react-query"

import { AddressValidationError } from "@/lib/errors"
import { queryKeys } from "@/lib/query-keys"
import {
  type CreateAddressData,
  createAddress,
  deleteAddress,
  updateAddress,
} from "@/services/customer-service"
import type { AddressFormData } from "@/utils/address-validation"
import { validateAddressForm } from "@/utils/address-validation"
import { cleanPhoneNumber } from "@/utils/format/format-phone-number"
import { cleanPostalCode } from "@/utils/format/format-postal-code"

/**
 * Clean address data before sending to API
 * Removes formatting (spaces, etc.) from postal code and phone number
 */
function cleanAddressData<T extends Partial<CreateAddressData>>(data: T): T {
  return {
    ...data,
    postal_code: data.postal_code
      ? cleanPostalCode(data.postal_code)
      : data.postal_code,
    phone: data.phone ? cleanPhoneNumber(data.phone) : data.phone,
  }
}

export function useCreateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAddressData) => {
      // Safety net validation before API call (validates formatted data)
      const errors = validateAddressForm(data as AddressFormData)
      if (Object.keys(errors).length > 0) {
        throw new AddressValidationError(errors)
      }

      // Clean data before API call
      const cleanedData = cleanAddressData(data)

      return await createAddress(cleanedData)
    },
    onSuccess: () => {
      // Invalidate addresses cache to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}

/**
 * Check if data contains enough fields to be considered complete address data
 * (used to decide whether to validate before API call)
 */
function isCompleteAddressData(data: Partial<CreateAddressData>): boolean {
  return "first_name" in data && "last_name" in data && "address_1" in data
}

export function useUpdateAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      addressId,
      data,
    }: {
      addressId: string
      data: Partial<CreateAddressData>
    }) => {
      // Safety net validation (only for complete address data, not partial updates)
      if (isCompleteAddressData(data)) {
        const errors = validateAddressForm(data as AddressFormData)
        if (Object.keys(errors).length > 0) {
          throw new AddressValidationError(errors)
        }
      }

      // Clean data before API call
      const cleanedData = cleanAddressData(data)

      return await updateAddress(addressId, cleanedData)
    },
    onSuccess: () => {
      // Invalidate addresses cache to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}

export function useDeleteAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (addressId: string) => deleteAddress(addressId),
    onSuccess: () => {
      // Invalidate addresses cache to refetch
      queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}
