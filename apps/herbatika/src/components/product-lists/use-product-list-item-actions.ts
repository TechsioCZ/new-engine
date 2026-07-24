"use client"

import type { HttpTypes } from "@medusajs/types"
import { useState } from "react"

import { useAppToast } from "@/hooks/use-app-toast"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  type StoreProductListItem,
  useDeleteProductListItem,
  useUpdateProductListItem,
} from "@/lib/storefront/product-lists"
import { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart"

export function useProductListItemActions(params: {
  activeListId: string | null | undefined
  activeListSupportsQuantity: boolean
  countryCode?: string
  regionId?: string
}) {
  const toast = useAppToast()
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  const [activeQuantitySetItemId, setActiveQuantitySetItemId] = useState<
    string | null
  >(null)
  const [activeDeleteItemId, setActiveDeleteItemId] = useState<string | null>(
    null
  )
  const updateItemMutation = useUpdateProductListItem()
  const deleteItemMutation = useDeleteProductListItem()
  const addToCart = useAddProductToCart({
    ...(params.regionId === undefined ? {} : { regionId: params.regionId }),
    ...(params.countryCode === undefined
      ? {}
      : { countryCode: params.countryCode }),
  })

  const handleAddToCart = async (
    item: StoreProductListItem,
    product: HttpTypes.StoreProduct
  ) => {
    const quantity =
      typeof item.quantity === "number" && item.quantity > 0
        ? Math.floor(item.quantity)
        : 1

    setActiveProductId(product.id)

    try {
      await addToCart.addProductToCart({
        product,
        quantity,
        ...(item.variant_id === undefined
          ? {}
          : { variantId: item.variant_id }),
      })
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(error, "Pridanie do košíka zlyhalo."),
      })
    } finally {
      setActiveProductId(null)
    }
  }

  const handleQuantitySet = async (
    item: StoreProductListItem,
    quantity: number
  ) => {
    if (!(item.id && params.activeListSupportsQuantity)) {
      return
    }

    const nextQuantity = Math.floor(quantity)
    const currentQuantity =
      typeof item.quantity === "number" && item.quantity > 0
        ? Math.floor(item.quantity)
        : 1

    if (!Number.isFinite(nextQuantity) || nextQuantity < 1) {
      return
    }

    if (nextQuantity === currentQuantity) {
      return
    }

    setActiveQuantitySetItemId(item.id)

    try {
      await updateItemMutation.mutateAsync({
        itemId: item.id,
        quantity: nextQuantity,
      })
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(error, "Množstvo sa nepodarilo upraviť."),
      })
    } finally {
      setActiveQuantitySetItemId(null)
    }
  }

  const handleDeleteItem = async (item: StoreProductListItem) => {
    if (!(params.activeListId && item.id)) {
      return
    }

    setActiveDeleteItemId(item.id)

    try {
      await deleteItemMutation.mutateAsync({
        listId: params.activeListId,
        itemId: item.id,
      })
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(
          error,
          "Produkt sa nepodarilo odstrániť zo zoznamu."
        ),
      })
    } finally {
      setActiveDeleteItemId(null)
    }
  }

  return {
    activeDeleteItemId,
    activeProductId,
    activeQuantitySetItemId,
    addToCart,
    handleAddToCart,
    handleDeleteItem,
    handleQuantitySet,
    setActiveProductId,
  }
}
