import type { HttpTypes } from "@medusajs/types"
import { filterSelectableShippingOptions } from "@/lib/pricing/cart-pricing"
import type { Cart, ShippingMethodData } from "@/types/cart"
import { checkoutFlow } from "./storefront-preset"
import { useCartToast } from "./use-toast"

export type UseCheckoutShippingReturn = {
  shippingOptions?: HttpTypes.StoreCartShippingOption[]
  shippingPrices?: Record<string, number>
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
  const shippingOptions = filterSelectableShippingOptions(shipping.shippingOptions)
  const selectedOption = shippingOptions.find(
    (option) => option.id === shipping.selectedShippingMethodId
  )

  return {
    shippingOptions,
    shippingPrices: shipping.shippingPrices,
    setShipping: shipping.setShipping,
    isSettingShipping: shipping.isSettingShipping,
    canLoadShipping: shipping.canLoadShipping,
    canSetShipping: shippingOptions.length > 0,
    selectedShippingMethodId: shipping.selectedShippingMethodId,
    selectedOption,
  }
}
