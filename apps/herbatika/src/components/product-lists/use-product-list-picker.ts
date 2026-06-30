"use client"

import { usePathname } from "next/navigation"
import { type FormEvent, useEffect, useState } from "react"
import type { Product } from "@/components/product-detail/product-detail.types"
import { useAppToast } from "@/hooks/use-app-toast"
import { useAuth } from "@/lib/storefront/auth"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  getProductListItemCount,
  getProductListTitle,
  isFavoriteProductList,
  isProductInProductList,
  type StoreProductList,
  useAddFavoriteProductListItem,
  useAddProductListItem,
  useCreateCustomProductList,
  useProductListDetails,
  useProductLists,
} from "@/lib/storefront/product-lists"

export type ProductListPickerRow = {
  key: string
  title: string
  count: number
  checked: boolean
  isFavorite: boolean
  list: StoreProductList | null
}

type UseProductListPickerInput = {
  product: Product
  quantity: number
  selectedVariantId: string | null
}

const normalizeQuantity = (quantity: number) =>
  Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1

const listById = (lists: Array<StoreProductList | null | undefined>) => {
  const map = new Map<string, StoreProductList>()

  for (const list of lists) {
    if (list?.id) {
      map.set(list.id, list)
    }
  }

  return map
}

export function useProductListPicker({
  product,
  quantity,
  selectedVariantId,
}: UseProductListPickerInput) {
  const pathname = usePathname()
  const authQuery = useAuth()
  const toast = useAppToast()
  const [isOpen, setIsOpen] = useState(false)
  const [showNewListInput, setShowNewListInput] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")
  const [activeListKey, setActiveListKey] = useState<string | null>(null)

  const customerId = authQuery.customer?.id ?? null
  const shouldFetchLists = isOpen && authQuery.isAuthenticated
  const listsQuery = useProductLists({
    customerId,
    limit: 100,
    enabled: shouldFetchLists,
  })
  const listIds = listsQuery.productLists.map((list) => list.id).filter(Boolean)
  const detailQueries = useProductListDetails(listIds, {
    customerId,
    enabled: shouldFetchLists && listIds.length > 0,
  })
  const createCustomMutation = useCreateCustomProductList()
  const addItemMutation = useAddProductListItem()
  const addFavoriteItemMutation = useAddFavoriteProductListItem()
  const quantityToAdd = normalizeQuantity(quantity)
  const isMutating =
    createCustomMutation.isPending ||
    addItemMutation.isPending ||
    addFavoriteItemMutation.isPending
  const detailListsById = listById(detailQueries.map((query) => query.data))
  const hydratedLists = listsQuery.productLists.map(
    (list) => detailListsById.get(list.id) ?? list
  )
  const favoriteList =
    hydratedLists.find((list) => isFavoriteProductList(list)) ?? null
  const customLists = hydratedLists.filter(
    (list) => !isFavoriteProductList(list)
  )
  const rows: ProductListPickerRow[] = [
    {
      key: favoriteList?.id ?? "favorite",
      title: "Obľúbené",
      count: getProductListItemCount(favoriteList),
      checked: isProductInProductList(
        favoriteList,
        product.id,
        selectedVariantId
      ),
      isFavorite: true,
      list: favoriteList,
    },
    ...customLists.map((list) => ({
      key: list.id,
      title: getProductListTitle(list),
      count: getProductListItemCount(list),
      checked: isProductInProductList(list, product.id, selectedVariantId),
      isFavorite: false,
      list,
    })),
  ]

  useEffect(() => {
    if (isOpen) {
      return
    }

    setShowNewListInput(false)
    setNewListTitle("")
    setActiveListKey(null)
  }, [isOpen])

  const addProductToList = async (row: ProductListPickerRow) => {
    if (row.checked) {
      return
    }

    if (!(row.isFavorite || row.list?.id)) {
      return
    }

    setActiveListKey(row.key)

    try {
      if (row.isFavorite) {
        await addFavoriteItemMutation.mutateAsync({
          productId: product.id,
          variantId: selectedVariantId,
          quantity: quantityToAdd,
        })
      } else if (row.list?.id) {
        await addItemMutation.mutateAsync({
          listId: row.list.id,
          productId: product.id,
          variantId: selectedVariantId,
          quantity: quantityToAdd,
        })
      }
    } catch (mutationError) {
      toast.error({
        title: resolveErrorMessage(
          mutationError,
          "Produkt sa nepodarilo pridať."
        ),
      })
    } finally {
      setActiveListKey(null)
    }
  }

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = newListTitle.trim()
    if (!title) {
      toast.warning({ title: "Zadajte názov zoznamu." })
      return
    }

    setActiveListKey("new-list")

    try {
      const createdList = await createCustomMutation.mutateAsync({
        title,
        access_type: "private",
      })

      if (!createdList?.id) {
        throw new Error("Backend nevrátil ID nového zoznamu.")
      }

      await addItemMutation.mutateAsync({
        listId: createdList.id,
        productId: product.id,
        variantId: selectedVariantId,
        quantity: quantityToAdd,
      })

      setNewListTitle("")
      setShowNewListInput(false)
    } catch (mutationError) {
      toast.error({
        title: resolveErrorMessage(
          mutationError,
          "Zoznam sa nepodarilo vytvoriť."
        ),
      })
    } finally {
      setActiveListKey(null)
    }
  }

  return {
    activeListKey,
    addProductToList,
    authQuery,
    detailsAreLoading:
      listIds.length > 0 && detailQueries.some((query) => query.isLoading),
    handleCreateList,
    isMutating,
    isOpen,
    listsQuery,
    loginHref: `/auth/login?next=${encodeURIComponent(pathname)}`,
    newListTitle,
    rows,
    setIsOpen,
    setNewListTitle,
    setShowNewListInput,
    showNewListInput,
  }
}
