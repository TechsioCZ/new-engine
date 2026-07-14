"use client"

import { useAppToast } from "@/hooks/use-app-toast"
import { useTranslations } from "next-intl"
import { useRemoveLineItem, useUpdateLineItem } from "./cart"

type UseCartLineItemActionsProps = {
  cartId?: string
}

export function useCartLineItemActions({
  cartId,
}: UseCartLineItemActionsProps) {
  const t = useTranslations("cart")
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
          toast.error({ title: t("update_failed") })
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
          toast.error({ title: t("remove_failed") })
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
