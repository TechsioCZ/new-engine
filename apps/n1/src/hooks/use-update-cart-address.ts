import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import type { Cart } from "@/services/cart-service"
import type { AddressErrors, AddressFormData } from "@/utils/address-validation"
import { validateAddressForm } from "@/utils/address-validation"

type UpdateCartAddressOptions = {
  onSuccess?: (cart: Cart) => void
  onError?: (error: Error) => void
}

type MutationContext = {
  previousCart: Cart | undefined
}

/** Helper to clean address data for Medusa API */
function cleanAddress(
  address: AddressFormData
): HttpTypes.StoreUpdateCart["shipping_address"] {
  const cleaned: HttpTypes.StoreUpdateCart["shipping_address"] = {
    first_name: address.first_name,
    last_name: address.last_name,
    address_1: address.address_1,
    city: address.city,
    postal_code: address.postal_code,
    country_code: address.country_code,
  }

  if (address.address_2?.trim()) {
    cleaned.address_2 = address.address_2
  }
  if (address.company?.trim()) {
    cleaned.company = address.company
  }
  if (address.province?.trim()) {
    cleaned.province = address.province
  }
  if (address.phone?.trim()) {
    cleaned.phone = address.phone
  }

  return cleaned
}

export function useUpdateCartAddress(options?: UpdateCartAddressOptions) {
  const queryClient = useQueryClient()

  return useMutation<
    Cart,
    Error,
    {
      cartId: string
      billingAddress: AddressFormData
      shippingAddress: AddressFormData
      email?: string
    },
    MutationContext
  >({
    mutationFn: async ({ cartId, billingAddress, shippingAddress, email }) => {
      if (!cartId) {
        throw new Error("Cart ID is required")
      }

      // Validate billing address
      const validationErrors: AddressErrors =
        validateAddressForm(billingAddress)
      if (Object.keys(validationErrors).length > 0) {
        const errorMessages = Object.values(validationErrors).join(", ")
        throw new Error(`Validation failed: ${errorMessages}`)
      }

      // Clean both addresses
      const cleanedBillingAddress = cleanAddress(billingAddress)
      const cleanedShippingAddress = cleanAddress(shippingAddress)

      // Update the cart with both addresses
      const response = await sdk.store.cart.update(cartId, {
        ...(cleanedBillingAddress
          ? { billing_address: cleanedBillingAddress }
          : {}),
        ...(cleanedShippingAddress
          ? { shipping_address: cleanedShippingAddress }
          : {}),
        ...(email ? { email } : {}),
      })

      if (!response.cart) {
        throw new Error("Failed to update addresses")
      }

      return response.cart
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.active() })

      // Snapshot the previous cart
      const previousCart = queryClient.getQueryData<Cart>(
        queryKeys.cart.active()
      )

      // Return context with previous cart for rollback
      return { previousCart }
    },
    onSuccess: (cart) => {
      // Update cache with new cart data
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      options?.onSuccess?.(cart)
    },
    onError: (error, _variables, context) => {
      // Rollback to previous cart on error
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }

      options?.onError?.(error)
    },
    onSettled: async () => {
      // Always refetch to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: queryKeys.cart.active(),
      })
    },
  })
}
