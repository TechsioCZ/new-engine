"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"

import { useAppToast } from "@/hooks/use-app-toast"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  useDeleteProductListItem,
  useUpdateProductListItem,
} from "@/lib/storefront/product-lists"
import type {
  StoreProductList,
  StoreProductListItem,
} from "@/lib/storefront/product-lists"

import { runMutationWithCleanup } from "./run-mutation-with-cleanup"

interface UseAccountProductListItemsInput {
  activeList: StoreProductList | null
  supportsQuantity: boolean
}

export const useAccountProductListItems = ({
  activeList,
  supportsQuantity,
}: UseAccountProductListItemsInput) => {
  const tAuth = useTranslations("auth")
  const toast = useAppToast()
  const [activeQuantitySetItemId, setActiveQuantitySetItemId] = useState<
    string | null
  >(null)
  const [activeDeleteItemId, setActiveDeleteItemId] = useState<string | null>(
    null,
  )
  const updateItemMutation = useUpdateProductListItem()
  const deleteItemMutation = useDeleteProductListItem()

  const handleQuantitySet = async (
    item: StoreProductListItem,
    quantity: number,
  ) => {
    if (item.id === undefined || item.id === "" || !supportsQuantity) {
      return
    }

    const nextQuantity = Math.floor(quantity)
    const currentQuantity =
      typeof item.quantity === "number" && item.quantity > 0
        ? Math.floor(item.quantity)
        : 1

    if (
      !Number.isFinite(nextQuantity) ||
      nextQuantity < 1 ||
      nextQuantity === currentQuantity
    ) {
      return
    }

    setActiveQuantitySetItemId(item.id)
    await runMutationWithCleanup({
      cleanup: () => {
        setActiveQuantitySetItemId(null)
      },
      onError: (error) => {
        toast.error({
          title: resolveErrorMessage(
            error,
            tAuth("product_lists.errors.quantity_update_failed"),
          ),
        })
      },
      operation: async () => {
        await updateItemMutation.mutateAsync({
          itemId: item.id,
          quantity: nextQuantity,
        })
      },
    })
  }

  const handleDeleteItem = async (item: StoreProductListItem) => {
    if (
      activeList?.id === undefined ||
      activeList.id === "" ||
      item.id === undefined ||
      item.id === ""
    ) {
      return
    }

    setActiveDeleteItemId(item.id)
    await runMutationWithCleanup({
      cleanup: () => {
        setActiveDeleteItemId(null)
      },
      onError: (error) => {
        toast.error({
          title: resolveErrorMessage(
            error,
            tAuth("product_lists.errors.remove_product_failed"),
          ),
        })
      },
      operation: async () => {
        await deleteItemMutation.mutateAsync({
          itemId: item.id,
          listId: activeList.id,
        })
      },
    })
  }

  return {
    activeDeleteItemId,
    activeQuantitySetItemId,
    handleDeleteItem,
    handleQuantitySet,
  }
}
