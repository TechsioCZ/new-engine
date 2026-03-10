import { storefront } from "./storefront-preset"
import { toError } from "@/lib/errors"
import type { Cart } from "@/types/cart"

type UpdateCartAddressOptions = {
  onSuccess?: (cart: Cart) => void
  onError?: (error: Error) => void
}

export function useUpdateCartAddress(options?: UpdateCartAddressOptions) {
  const cartHooks = storefront.hooks.cart
  return cartHooks.useUpdateCartAddress({
    onSuccess: (cart) => {
      options?.onSuccess?.(cart)
    },
    onError: (error) => {
      options?.onError?.(toError(error, "Failed to update addresses"))
    },
  })
}
