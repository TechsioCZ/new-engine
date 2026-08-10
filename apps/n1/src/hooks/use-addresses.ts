import { useMutation, useQueryClient } from "@tanstack/react-query"

import { AddressValidationError } from "@/lib/address-validation-error"
import { queryKeys } from "@/lib/query-keys"
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from "@/services/customer-service"
import type { CreateAddressData } from "@/services/customer-service"
import { validateAddressForm } from "@/utils/address-validation"
import { cleanPhoneNumber } from "@/utils/format/format-phone-number"
import { cleanPostalCode } from "@/utils/format/format-postal-code"

/**
 * Clean address data before sending to API
 * Removes formatting (spaces, etc.) from postal code and phone number
 */
const cleanAddressData = <T extends Partial<CreateAddressData>>(
  data: T,
): T => ({
  ...data,
  phone:
    data.phone !== null && data.phone !== undefined && data.phone !== ""
      ? cleanPhoneNumber(data.phone)
      : data.phone,
  postal_code:
    data.postal_code !== null &&
    data.postal_code !== undefined &&
    data.postal_code !== ""
      ? cleanPostalCode(data.postal_code)
      : data.postal_code,
})

export const useCreateAddress = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateAddressData) => {
      // Safety net validation before API call (validates formatted data)
      const errors = validateAddressForm(data)
      if (Object.keys(errors).length > 0) {
        throw new AddressValidationError(errors)
      }

      // Clean data before API call
      const cleanedData = cleanAddressData(data)

      return await createAddress(cleanedData)
    },
    onSuccess: async () => {
      // Invalidate addresses cache to refetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}

/**
 * Check if data contains enough fields to be considered complete address data
 * (used to decide whether to validate before API call)
 */
const isCompleteAddressData = (
  data: Partial<CreateAddressData>,
): data is CreateAddressData => {
  if (typeof data.first_name !== "string") {
    return false
  }
  if (typeof data.last_name !== "string") {
    return false
  }
  if (typeof data.address_1 !== "string") {
    return false
  }
  if (typeof data.city !== "string") {
    return false
  }
  if (typeof data.postal_code !== "string") {
    return false
  }
  return typeof data.country_code === "string"
}

export const useUpdateAddress = () => {
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
        const errors = validateAddressForm(data)
        if (Object.keys(errors).length > 0) {
          throw new AddressValidationError(errors)
        }
      }

      // Clean data before API call
      const cleanedData = cleanAddressData(data)

      return await updateAddress(addressId, cleanedData)
    },
    onSuccess: async () => {
      // Invalidate addresses cache to refetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}

export const useDeleteAddress = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (addressId: string) => {
      await deleteAddress(addressId)
    },
    onSuccess: async () => {
      // Invalidate addresses cache to refetch
      await queryClient.invalidateQueries({
        queryKey: queryKeys.customer.profile(),
      })
    },
  })
}
