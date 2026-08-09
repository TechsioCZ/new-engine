"use client"

import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { useAppToast } from "@/hooks/use-app-toast"
import { useCreateProductListCart } from "@/lib/storefront/product-lists"
import type {
  StoreProductList,
  StoreProductListItem,
} from "@/lib/storefront/product-lists"
import {
  resolveAddProductToCartErrorMessage,
  useAddProductToCart,
} from "@/lib/storefront/use-add-product-to-cart"

import {
  resolveListCartErrorMessage,
  showPartialListCartResult,
} from "./account-product-list-cart.utils"
import {
  hasRegionSelection,
  resolveRegionMutationOptions,
} from "./account-product-list-controller.utils"
import { resolveProductListItemQuantity } from "./account-product-lists.utils"
import type { ProductListAvailabilitySummary } from "./product-list-availability"
import { runMutationWithCleanup } from "./run-mutation-with-cleanup"

interface UseAccountProductListCartInput {
  activeList: StoreProductList | null
  availabilitySummary: ProductListAvailabilitySummary
  countryCode: string | undefined
  customerEmail: string | undefined
  regionId: string | undefined
}

export const useAccountProductListCart = ({
  activeList,
  availabilitySummary,
  countryCode,
  customerEmail,
  regionId,
}: UseAccountProductListCartInput) => {
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
  const toast = useAppToast()
  const [activeProductId, setActiveProductId] = useState<string | null>(null)
  const [isAddingListToCart, setIsAddingListToCart] = useState(false)
  const createListCartMutation = useCreateProductListCart()
  const addToCart = useAddProductToCart(
    resolveRegionMutationOptions(regionId, countryCode),
  )
  const regionIsSelected = hasRegionSelection(regionId, countryCode)
  const activeListCanCreateCart =
    activeList?.id !== undefined &&
    activeList.id !== "" &&
    availabilitySummary.canAddAnyToCart &&
    regionIsSelected
  const errorMessages = {
    addListFailed: tAuth("product_lists.errors.add_list_to_cart_failed"),
    allAvailableFailed: tAuth("product_lists.errors.add_available_all_failed"),
    missingVariant: tAuth("product_lists.errors.missing_variant"),
    partiallyAvailableFailed: tAuth(
      "product_lists.errors.add_available_partial_failed",
    ),
  }

  const handleAddToCart = async (
    item: StoreProductListItem,
    product: HttpTypes.StoreProduct,
  ) => {
    setActiveProductId(product.id)
    await runMutationWithCleanup({
      cleanup: () => {
        setActiveProductId(null)
      },
      onError: (error) => {
        toast.error({
          title: resolveAddProductToCartErrorMessage(error, tCart("failed")),
        })
      },
      operation: async () => {
        await addToCart.addProductToCart({
          product,
          quantity: resolveProductListItemQuantity(item),
          ...(item.variant_id === undefined
            ? {}
            : { variantId: item.variant_id }),
        })
      },
    })
  }

  const addPurchasableItemsToCart = async () => {
    const addResults = await Promise.all(
      availabilitySummary.purchasableItems.map(async ({ item, product }) => {
        try {
          await addToCart.addProductToCart({
            product,
            quantity: resolveProductListItemQuantity(item),
            ...(item.variant_id === undefined
              ? {}
              : { variantId: item.variant_id }),
          })
          return true
        } catch {
          return false
        }
      }),
    )
    return {
      failedCount: addResults.filter((wasAdded) => !wasAdded).length,
      totalCount: availabilitySummary.purchasableItems.length,
    }
  }

  const handleAddListToCart = async () => {
    if (
      activeList?.id === undefined ||
      activeList.id === "" ||
      !availabilitySummary.canAddAnyToCart
    ) {
      return
    }
    if (!regionIsSelected) {
      toast.warning({ title: tCart("missing_region") })
      return
    }

    setIsAddingListToCart(true)
    await runMutationWithCleanup({
      cleanup: () => {
        setActiveProductId(null)
        setIsAddingListToCart(false)
      },
      onError: (error) => {
        toast.error({
          title: resolveListCartErrorMessage(error, errorMessages),
        })
      },
      operation: async () => {
        if (availabilitySummary.canAddWholeList) {
          await createListCartMutation.mutateAsync({
            listId: activeList.id,
            ...(regionId === undefined ? {} : { regionId }),
            ...(countryCode === undefined ? {} : { countryCode }),
            ...(customerEmail === undefined ? {} : { email: customerEmail }),
          })
        } else {
          const addResult = await addPurchasableItemsToCart()
          showPartialListCartResult({
            ...addResult,
            messages: errorMessages,
            toast,
          })
        }
      },
    })
  }

  return {
    activeListCanCreateCart,
    activeProductId,
    createListCartMutation,
    handleAddListToCart,
    handleAddToCart,
    isAddingListToCart,
  }
}
