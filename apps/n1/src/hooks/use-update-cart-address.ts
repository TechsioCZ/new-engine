import type { HttpTypes } from "@medusajs/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { hasTrimmedString } from "@techsio/std/string"

import { CartAddressUpdateError } from "@/lib/cart-address-update-error"
import { resolveErrorMessage } from "@/lib/errors"
import { sdk } from "@/lib/medusa-client"
import { queryKeys } from "@/lib/query-keys"
import type { Cart } from "@/services/cart-service"
import type { AddressErrors, AddressFormData } from "@/utils/address-validation"
import { validateAddressForm } from "@/utils/address-validation"

type CartAddressInput = Exclude<
  HttpTypes.StoreUpdateCart["shipping_address"],
  string | undefined
>

interface UpdateCartAddressOptions {
  onSuccess?: (cart: Cart) => void
  onError?: (error: Error) => void
}

interface MutationContext {
  previousCart: Cart | undefined
}

/** Helper to clean address data for Medusa API */
const cleanAddress = (address: AddressFormData): CartAddressInput => {
  const cleaned: CartAddressInput = {
    address_1: address.address_1,
    city: address.city,
    country_code: address.country_code,
    first_name: address.first_name,
    last_name: address.last_name,
    postal_code: address.postal_code,
  }

  if (hasTrimmedString(address.address_2)) {
    cleaned.address_2 = address.address_2
  }
  if (hasTrimmedString(address.company)) {
    cleaned.company = address.company
  }
  if (hasTrimmedString(address.province)) {
    cleaned.province = address.province
  }
  if (hasTrimmedString(address.phone)) {
    cleaned.phone = address.phone
  }

  return cleaned
}

export const useUpdateCartAddress = (options?: UpdateCartAddressOptions) => {
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
        throw new CartAddressUpdateError(
          "Cart ID is required",
          "ADDRESS_UPDATE_REJECTED",
        )
      }

      // Validate billing address
      const validationErrors: AddressErrors =
        validateAddressForm(billingAddress)
      if (Object.keys(validationErrors).length > 0) {
        const errorMessages = Object.values(validationErrors).join(", ")
        throw new CartAddressUpdateError(
          `Validation failed: ${errorMessages}`,
          "BILLING_ADDRESS_INVALID",
        )
      }

      // Clean both addresses
      const cleanedBillingAddress = cleanAddress(billingAddress)
      const cleanedShippingAddress = cleanAddress(shippingAddress)

      // Update the cart with both addresses
      let response: Awaited<ReturnType<typeof sdk.store.cart.update>>
      try {
        response = await sdk.store.cart.update(cartId, {
          billing_address: cleanedBillingAddress,
          shipping_address: cleanedShippingAddress,
          ...(email !== undefined && email !== "" ? { email } : {}),
        })
      } catch (error) {
        throw new CartAddressUpdateError(
          resolveErrorMessage(error),
          "ADDRESS_UPDATE_REJECTED",
          error,
        )
      }

      return response.cart
    },
    onError: (error, _variables, context) => {
      // Rollback to previous cart on error
      if (context?.previousCart) {
        queryClient.setQueryData(queryKeys.cart.active(), context.previousCart)
      }

      options?.onError?.(error)
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.cart.active() })

      // Snapshot the previous cart
      const previousCart = queryClient.getQueryData<Cart>(
        queryKeys.cart.active(),
      )

      // Return context with previous cart for rollback
      return { previousCart }
    },
    onSettled: async () => {
      // Always refetch to ensure consistency
      await queryClient.invalidateQueries({
        queryKey: queryKeys.cart.active(),
      })
    },
    onSuccess: (cart) => {
      // Update cache with new cart data
      queryClient.setQueryData(queryKeys.cart.active(), cart)

      options?.onSuccess?.(cart)
    },
  })
}
