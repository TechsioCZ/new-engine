"use client"

import { useTranslations } from "next-intl"
import type { SubmitEvent } from "react"

import type { Product } from "@/components/product-detail/product-detail.types"
import { useAppToast } from "@/hooks/use-app-toast"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  useAddFavoriteProductListItem,
  useAddProductListItem,
  useCreateCustomProductList,
} from "@/lib/storefront/product-lists"

import type { ProductListPickerRow } from "./product-list-picker-rows"
import { normalizeProductListPickerQuantity } from "./product-list-picker-rows"

interface UseProductListPickerActionsInput {
  clearNewListForm: () => void
  newListTitle: string
  product: Product
  quantity: number
  selectedVariantId: string | null
  setActiveListKey: (value: string | null) => void
}

export const useProductListPickerActions = ({
  clearNewListForm,
  newListTitle,
  product,
  quantity,
  selectedVariantId,
  setActiveListKey,
}: UseProductListPickerActionsInput) => {
  const tAuth = useTranslations("auth")
  const toast = useAppToast()
  const createCustomMutation = useCreateCustomProductList()
  const addItemMutation = useAddProductListItem()
  const addFavoriteItemMutation = useAddFavoriteProductListItem()
  const quantityToAdd = normalizeProductListPickerQuantity(quantity)
  const isMutating =
    createCustomMutation.isPending ||
    addItemMutation.isPending ||
    addFavoriteItemMutation.isPending

  const addProductToList = async (row: ProductListPickerRow) => {
    if (row.checked) {
      return
    }
    if (!row.isFavorite && (row.list?.id === undefined || row.list.id === "")) {
      return
    }

    setActiveListKey(row.key)
    try {
      if (row.isFavorite) {
        await addFavoriteItemMutation.mutateAsync({
          productId: product.id,
          quantity: quantityToAdd,
          variantId: selectedVariantId,
        })
      } else if (row.list?.id !== undefined && row.list.id !== "") {
        await addItemMutation.mutateAsync({
          listId: row.list.id,
          productId: product.id,
          quantity: quantityToAdd,
          variantId: selectedVariantId,
        })
      }
    } catch (mutationError) {
      toast.error({
        title: resolveErrorMessage(
          mutationError,
          tAuth("product_lists.errors.add_product_failed"),
        ),
      })
    } finally {
      setActiveListKey(null)
    }
  }

  const handleCreateList = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = newListTitle.trim()
    if (title === "") {
      toast.warning({
        title: tAuth("product_lists.validation.title_required"),
      })
      return
    }

    setActiveListKey("new-list")
    try {
      const createdList = await createCustomMutation.mutateAsync({
        access_type: "private",
        title,
      })
      if (createdList?.id === undefined || createdList.id === "") {
        throw new Error(tAuth("product_lists.errors.create_failed"))
      }
      await addItemMutation.mutateAsync({
        listId: createdList.id,
        productId: product.id,
        quantity: quantityToAdd,
        variantId: selectedVariantId,
      })
      clearNewListForm()
    } catch (mutationError) {
      toast.error({
        title: resolveErrorMessage(
          mutationError,
          tAuth("product_lists.errors.create_failed"),
        ),
      })
    } finally {
      setActiveListKey(null)
    }
  }

  return {
    addProductToList,
    handleCreateList,
    isMutating,
  }
}
