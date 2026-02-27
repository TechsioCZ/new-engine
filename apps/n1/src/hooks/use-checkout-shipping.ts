import type { HttpTypes } from "@medusajs/types"
import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { syncCartCaches } from "./cart-cache-sync"
import { checkoutHooks } from "./checkout-hooks-base"
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

const cleanShippingMethodData = (
  data?: ShippingMethodData
): Record<string, unknown> | undefined => {
  if (!data) {
    return undefined
  }

  const entries = Object.entries(data).filter(
    ([, value]) => value != null && value !== ""
  )

  if (entries.length === 0) {
    return undefined
  }

  return Object.fromEntries(entries)
}

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }

  return value as Record<string, unknown>
}

const toComparableShippingData = (
  data?: Record<string, unknown>
): string =>
  JSON.stringify(
    Object.entries(data ?? {})
      .filter(([, value]) => value != null && value !== "")
      .sort(([a], [b]) => a.localeCompare(b))
  )

const isSameShippingSelection = ({
  selectedOptionId,
  nextOptionId,
  nextData,
  currentData,
}: {
  selectedOptionId?: string
  nextOptionId: string
  nextData?: Record<string, unknown>
  currentData?: unknown
}): boolean => {
  if (selectedOptionId !== nextOptionId) {
    return false
  }

  return (
    toComparableShippingData(nextData) ===
    toComparableShippingData(toRecord(currentData))
  )
}

export function useCheckoutShipping(
  cartId?: string,
  cart?: Cart | null
): UseCheckoutShippingReturn {
  const queryClient = useQueryClient()
  const toast = useCartToast()

  const canLoadShipping = Boolean(cartId && (cart?.items?.length ?? 0) > 0)

  const shipping = checkoutHooks.useCheckoutShipping(
    {
      cartId,
      cart,
      enabled: canLoadShipping,
    },
    {
      onSuccess: (updatedCart) => {
        syncCartCaches(queryClient, updatedCart as Cart)
      },
      onError: () => {
        toast.shippingError()
      },
    }
  )

  const setShipping = useCallback(
    (optionId: string, data?: ShippingMethodData) => {
      const cleanedData = cleanShippingMethodData(data)
      const currentData = cart?.shipping_methods?.find(
        (method) => method.shipping_option_id === optionId
      )?.data

      if (
        isSameShippingSelection({
          selectedOptionId: shipping.selectedShippingMethodId,
          nextOptionId: optionId,
          nextData: cleanedData,
          currentData,
        })
      ) {
        return
      }

      shipping.setShippingMethod(optionId, cleanedData)
    },
    [cart?.shipping_methods, shipping.selectedShippingMethodId, shipping.setShippingMethod]
  )

  return {
    shippingOptions: shipping.shippingOptions,
    setShipping,
    isSettingShipping: shipping.isSettingShipping,
    canLoadShipping,
    canSetShipping: shipping.shippingOptions.length > 0,
    selectedShippingMethodId: shipping.selectedShippingMethodId,
    selectedOption: shipping.selectedOption,
  }
}
