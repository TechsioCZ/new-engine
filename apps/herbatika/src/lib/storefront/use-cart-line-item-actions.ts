"use client"

import { useTranslations } from "next-intl"

import { useAppToast } from "@/hooks/use-app-toast"

import { useRemoveLineItem, useUpdateLineItem } from "./cart"

interface UseCartLineItemActionsProps {
  cartId?: string
}

export const useCartLineItemActions = ({
  cartId,
}: UseCartLineItemActionsProps) => {
  const t = useTranslations("cart")
  const toast = useAppToast()
  const updateLineItemMutation = useUpdateLineItem()
  const removeLineItemMutation = useRemoveLineItem()

  const updateQuantity = (lineItemId: string, quantity: number) => {
    if (cartId === undefined || cartId.length === 0) {
      return
    }

    updateLineItemMutation.mutate(
      { cartId, lineItemId, quantity },
      {
        onError: () => {
          toast.error({ title: t("update_failed") })
        },
      },
    )
  }

  const removeItem = (lineItemId: string) => {
    if (cartId === undefined || cartId.length === 0) {
      return
    }

    removeLineItemMutation.mutate(
      { cartId, lineItemId },
      {
        onError: () => {
          toast.error({ title: t("remove_failed") })
        },
      },
    )
  }

  return {
    isPending:
      updateLineItemMutation.isPending || removeLineItemMutation.isPending,
    removeItem,
    updateQuantity,
  }
}
