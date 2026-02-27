import { cartHooks } from "./cart-hooks-base"
import { toError } from "@/lib/errors"
import type { Cart } from "@/types/cart"
import type { AddressFormData } from "@/utils/address-validation"

type UpdateCartAddressOptions = {
  onSuccess?: (cart: Cart) => void
  onError?: (error: Error) => void
}

export function useUpdateCartAddress(options?: UpdateCartAddressOptions) {
  return cartHooks.useUpdateCartAddress({
    onSuccess: (cart) => {
      options?.onSuccess?.(cart)
    },
    onError: (error) => {
      options?.onError?.(toError(error, "Failed to update addresses"))
    },
  })
}

export type { AddressFormData }
