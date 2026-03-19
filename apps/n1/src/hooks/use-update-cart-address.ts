import { toError } from "@/lib/errors"
import type { Cart } from "@/types/cart"
import { storefront } from "./storefront-preset"

type UpdateCartAddressOptions = {
  onSuccess?: (cart: Cart) => void
  onError?: (error: Error) => void
}

type UseUpdateCartAddressResult = ReturnType<
  typeof storefront.hooks.cart.useUpdateCartAddress
>

export function useUpdateCartAddress(
  options?: UpdateCartAddressOptions
): UseUpdateCartAddressResult {
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
