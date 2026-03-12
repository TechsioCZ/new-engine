import type { HttpTypes } from "@medusajs/types"
import { checkoutFlow } from "./storefront-preset"
import { useCartToast } from "./use-toast"
import type { Cart, ShippingMethodData } from "@/types/cart"

export type UseCheckoutShippingReturn = {
  shippingOptions?: HttpTypes.StoreCartShippingOption[]
  setShipping: (optionId: string, data?: ShippingMethodData) => void
  isSettingShipping: boolean
  canLoadShipping: boolean
  canSetShipping: boolean
  selectedShippingMethodId?: string
  selectedOption?: HttpTypes.StoreCartShippingOption
}

export function useCheckoutShipping(
  cartId?: string,
  cart?: Cart | null
): UseCheckoutShippingReturn {
  const toast = useCartToast()

  const shipping = checkoutFlow.useCheckoutShipping(cartId, cart, {
    onError: () => {
      toast.shippingError()
    },
  })

  return {
    shippingOptions: shipping.shippingOptions,
    setShipping: shipping.setShipping,
    isSettingShipping: shipping.isSettingShipping,
    canLoadShipping: shipping.canLoadShipping,
    canSetShipping: shipping.canSetShipping,
    selectedShippingMethodId: shipping.selectedShippingMethodId,
    selectedOption: shipping.selectedOption,
  }
}
