"use client"

import { useState } from "react"

import { useAppToast } from "@/hooks/use-app-toast"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  type StoreProductList,
  useCreateProductListCart,
} from "@/lib/storefront/product-lists"
import type { useAddProductToCart } from "@/lib/storefront/use-add-product-to-cart"

import {
  type ProductListAvailabilitySummary,
  resolveProductListItemQuantity,
} from "./account-product-lists.utils"

const MISSING_VARIANT_ERROR_PATTERN = /has no variant selected|no variant/i

const resolveListCartErrorMessage = (error: unknown) => {
  const errorMessage = resolveErrorMessage(
    error,
    "Zoznam sa nepodarilo pridať do košíka."
  )

  return MISSING_VARIANT_ERROR_PATTERN.test(errorMessage)
    ? "Niektoré produkty v zozname nemajú vybranú variantu."
    : errorMessage
}

export function useProductListCartAction(params: {
  activeList: StoreProductList | null
  availability: ProductListAvailabilitySummary
  countryCode?: string
  customerEmail?: string
  regionId?: string
  addToCart: ReturnType<typeof useAddProductToCart>
  setActiveProductId: (productId: string | null) => void
}) {
  const toast = useAppToast()
  const createListCartMutation = useCreateProductListCart()
  const [isAddingListToCart, setIsAddingListToCart] = useState(false)

  const addPurchasableItemsToCart = async () => {
    let failedCount = 0

    for (const { item, product } of params.availability.purchasableItems) {
      params.setActiveProductId(product.id)

      try {
        await params.addToCart.addProductToCart({
          product,
          quantity: resolveProductListItemQuantity(item),
          ...(item.variant_id === undefined
            ? {}
            : { variantId: item.variant_id }),
        })
      } catch {
        failedCount += 1
      }
    }

    return failedCount
  }

  const handleAddListToCart = async () => {
    if (!(params.activeList?.id && params.availability.canAddAnyToCart)) {
      return
    }

    if (!(params.regionId || params.countryCode)) {
      toast.warning({
        title: "Región sa ešte načítava. Skúste to prosím o chvíľu.",
      })
      return
    }

    setIsAddingListToCart(true)

    try {
      if (params.availability.canAddWholeList) {
        await createListCartMutation.mutateAsync({
          listId: params.activeList.id,
          ...(params.regionId === undefined
            ? {}
            : { regionId: params.regionId }),
          ...(params.countryCode === undefined
            ? {}
            : { countryCode: params.countryCode }),
          ...(params.customerEmail === undefined
            ? {}
            : { email: params.customerEmail }),
        })
        return
      }

      const failedCount = await addPurchasableItemsToCart()
      const totalCount = params.availability.purchasableItems.length
      if (failedCount === totalCount) {
        toast.error({
          title: "Dostupné položky sa nepodarilo pridať do košíka.",
        })
      } else if (failedCount > 0) {
        toast.warning({
          title: "Niektoré dostupné položky sa nepodarilo pridať do košíka.",
        })
      }
    } catch (error) {
      toast.error({ title: resolveListCartErrorMessage(error) })
    } finally {
      params.setActiveProductId(null)
      setIsAddingListToCart(false)
    }
  }

  return {
    createListCartMutation,
    handleAddListToCart,
    isAddingListToCart,
  }
}
