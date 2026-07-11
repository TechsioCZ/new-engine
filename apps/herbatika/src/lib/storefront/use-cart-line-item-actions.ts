"use client"

import { useAppToast } from "@/hooks/use-app-toast"
import { useRemoveLineItem, useUpdateLineItem } from "./cart"
import { useCartStorefrontTexts } from "./use-cart-storefront-texts"

type UseCartLineItemActionsProps = {
  cartId?: string
}

export function useCartLineItemActions({
  cartId,
}: UseCartLineItemActionsProps) {
  const cartTexts = useCartStorefrontTexts()
  const toast = useAppToast()
  const updateLineItemMutation = useUpdateLineItem()
  const removeLineItemMutation = useRemoveLineItem()

  const updateQuantity = (lineItemId: string, quantity: number) => {
    if (!cartId) {
      return
    }

    updateLineItemMutation.mutate(
      { cartId, lineItemId, quantity },
      {
        onError: () => {
          toast.error({ title: cartTexts.updateFailed })
        },
      }
    )
  }

  const removeItem = (lineItemId: string) => {
    if (!cartId) {
      return
    }

    removeLineItemMutation.mutate(
      { cartId, lineItemId },
      {
        onError: () => {
          toast.error({ title: cartTexts.removeFailed })
        },
      }
    )
  }

  return {
    isPending:
      updateLineItemMutation.isPending || removeLineItemMutation.isPending,
    removeItem,
    updateQuantity,
  }
}
