"use client"

import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import type { FormEvent } from "react"

import type { Product } from "@/components/product-detail/product-detail.types"
import { useAppToast } from "@/hooks/use-app-toast"
import { useAuth } from "@/lib/storefront/auth"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  getProductListItemCount,
  getProductListTitle,
  isFavoriteProductList,
  isProductInProductList,
  useAddFavoriteProductListItem,
  useAddProductListItem,
  useCreateCustomProductList,
  useProductListDetails,
  useProductLists,
} from "@/lib/storefront/product-lists"
import type { StoreProductList } from "@/lib/storefront/product-lists"

export interface ProductListPickerRow {
  key: string
  title: string
  count: number
  checked: boolean
  isFavorite: boolean
  list: StoreProductList | null
}

interface UseProductListPickerInput {
  product: Product
  quantity: number
  selectedVariantId: string | null
}

const normalizeQuantity = (quantity: number) =>
  Number.isFinite(quantity) && quantity >= 1 ? Math.floor(quantity) : 1

const listById = (lists: (StoreProductList | null | undefined)[]) => {
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
  const tAuth = useTranslations("auth")
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
    enabled: shouldFetchLists,
    limit: 100,
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
    (list) => detailListsById.get(list.id) ?? list,
  )
  const favoriteList =
    hydratedLists.find((list) => isFavoriteProductList(list)) ?? null
  const customLists = hydratedLists.filter(
    (list) => !isFavoriteProductList(list),
  )
  const rows: ProductListPickerRow[] = [
    {
      checked: isProductInProductList(
        favoriteList,
        product.id,
        selectedVariantId,
      ),
      count: getProductListItemCount(favoriteList),
      isFavorite: true,
      key: favoriteList?.id ?? "favorite",
      list: favoriteList,
      title: tAuth("product_lists.favorite_title"),
    },
    ...customLists.map((list) => ({
      checked: isProductInProductList(list, product.id, selectedVariantId),
      count: getProductListItemCount(list),
      isFavorite: false,
      key: list.id,
      list,
      title: getProductListTitle(list, {
        favorite: tAuth("product_lists.favorite_title"),
        untitled: tAuth("product_lists.untitled_list"),
      }),
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
          quantity: quantityToAdd,
          variantId: selectedVariantId,
        })
      } else if (row.list?.id) {
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

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = newListTitle.trim()
    if (!title) {
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

      if (!createdList?.id) {
        throw new Error(tAuth("product_lists.errors.create_failed"))
      }

      await addItemMutation.mutateAsync({
        listId: createdList.id,
        productId: product.id,
        quantity: quantityToAdd,
        variantId: selectedVariantId,
      })

      setNewListTitle("")
      setShowNewListInput(false)
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

  const retryLists = async () => {
    await Promise.all([
      listsQuery.query.refetch(),
      ...detailQueries.map(async (query) => query.refetch()),
    ])
  }

  return {
    activeListKey,
    addProductToList,
    authQuery,
    detailsAreLoading:
      listIds.length > 0 && detailQueries.some((query) => query.isLoading),
    detailsHaveError: detailQueries.some((query) => Boolean(query.error)),
    handleCreateList,
    isMutating,
    isOpen,
    listsQuery,
    loginHref: `/auth/login?next=${encodeURIComponent(pathname)}`,
    newListTitle,
    retryLists,
    rows,
    setIsOpen,
    setNewListTitle,
    setShowNewListInput,
    showNewListInput,
  }
}
