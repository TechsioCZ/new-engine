"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { type FormEvent, useState } from "react"

import { useAppToast } from "@/hooks/use-app-toast"
import { useAuth } from "@/lib/storefront/auth"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  getProductListItems,
  isFavoriteProductList,
  useCreateCustomProductList,
  useDeleteProductList,
  useProductList,
  useProductLists,
} from "@/lib/storefront/product-lists"
import { PRODUCT_CARD_FIELDS, useProducts } from "@/lib/storefront/products"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

import {
  buildProductMap,
  resolveProductListAvailabilitySummary,
  resolveProductListPriceSummary,
  sortProductLists,
  uniqueProductIds,
} from "./account-product-lists.utils"
import { useProductListCartAction } from "./use-product-list-cart-action"
import { useProductListItemActions } from "./use-product-list-item-actions"
import { useProductListSelection } from "./use-product-list-selection"

export function useAccountProductLists() {
  const authQuery = useAuth()
  const region = useRegionContext()
  const toast = useAppToast()
  const [showCreateListDialog, setShowCreateListDialog] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")

  const customerId = authQuery.customer?.id ?? null
  const listsQuery = useProductLists({
    customerId,
    limit: 100,
    enabled: authQuery.isAuthenticated,
  })
  const sortedLists = sortProductLists(listsQuery.productLists)
  const {
    activeListId,
    closeDeleteListDialog,
    deleteListId,
    handleSelectedListDeleted,
    openDeleteListDialog,
    selectList,
  } = useProductListSelection(sortedLists)
  const activeListQuery = useProductList(activeListId, {
    customerId,
    enabled: authQuery.isAuthenticated && Boolean(activeListId),
  })
  const activeList =
    activeListQuery.productList ??
    sortedLists.find((list) => list.id === activeListId) ??
    null
  const activeListSupportsQuantity = Boolean(activeList)
  const deleteList =
    sortedLists.find(
      (list) => list.id === deleteListId && !isFavoriteProductList(list)
    ) ?? null
  const activeItems = getProductListItems(activeList)
  const productIds = uniqueProductIds(activeItems)
  const productsQuery = useProducts({
    ...(productIds.length > 0 ? { id: productIds } : {}),
    page: 1,
    limit: Math.max(productIds.length, 1),
    fields: PRODUCT_CARD_FIELDS,
    enabled: Boolean(region?.region_id && activeListId && productIds.length),
  })
  const productsById = buildProductMap(activeItems, productsQuery.products)
  const activeProductsAreLoading =
    productsQuery.isLoading &&
    productIds.some((productId) => !productsById.has(productId))
  const regionCurrencyCode = resolveRegionCurrency(region)
  const activeListPriceSummary = resolveProductListPriceSummary({
    currencyCode: regionCurrencyCode,
    items: activeItems,
    productsById,
  })
  const activeListAvailabilitySummary = resolveProductListAvailabilitySummary({
    items: activeItems,
    productsById,
  })
  const createListMutation = useCreateCustomProductList()
  const deleteListMutation = useDeleteProductList()
  const {
    activeDeleteItemId,
    activeProductId,
    activeQuantitySetItemId,
    addToCart,
    handleAddToCart,
    handleDeleteItem,
    handleQuantitySet,
    setActiveProductId,
  } = useProductListItemActions({
    activeListId: activeList?.id,
    activeListSupportsQuantity,
    ...(region?.region_id === undefined ? {} : { regionId: region.region_id }),
    ...(region?.country_code === undefined
      ? {}
      : { countryCode: region.country_code }),
  })
  const { createListCartMutation, handleAddListToCart, isAddingListToCart } =
    useProductListCartAction({
      activeList,
      availability: activeListAvailabilitySummary,
      addToCart,
      setActiveProductId,
      ...(region?.region_id === undefined
        ? {}
        : { regionId: region.region_id }),
      ...(region?.country_code === undefined
        ? {}
        : { countryCode: region.country_code }),
      ...(authQuery.customer?.email === undefined
        ? {}
        : { customerEmail: authQuery.customer.email }),
    })
  const activeListCanCreateCart = Boolean(
    activeList?.id &&
    activeListAvailabilitySummary.canAddAnyToCart &&
    (region?.region_id || region?.country_code)
  )

  const openCreateListDialog = () => {
    setShowCreateListDialog(true)
  }

  const closeCreateListDialog = () => {
    setShowCreateListDialog(false)
    setNewListTitle("")
  }

  const handleCreateList = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const title = newListTitle.trim()
    if (!title) {
      toast.warning({ title: "Zadajte názov zoznamu." })
      return
    }

    try {
      const createdList = await createListMutation.mutateAsync({
        title,
        access_type: "private",
      })

      if (createdList?.id) {
        selectList(createdList.id)
      }

      setNewListTitle("")
      setShowCreateListDialog(false)
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(error, "Zoznam sa nepodarilo vytvoriť."),
      })
    }
  }

  const handleDeleteList = async () => {
    if (!deleteList?.id) {
      return
    }

    const deletedListId = deleteList.id
    try {
      await deleteListMutation.mutateAsync({ listId: deletedListId })
      handleSelectedListDeleted(deletedListId)
      closeDeleteListDialog()
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(error, "Zoznam sa nepodarilo zmazať."),
      })
    }
  }

  return {
    activeDeleteItemId,
    activeItems,
    activeList,
    activeListAvailabilitySummary,
    activeListCanCreateCart,
    activeListPriceSummary,
    activeListId,
    activeListSupportsQuantity,
    activeListQuery,
    activeProductsAreLoading,
    activeProductId,
    activeQuantitySetItemId,
    closeCreateListDialog,
    closeDeleteListDialog,
    createListCartMutation,
    createListMutation,
    deleteList,
    deleteListMutation,
    handleAddToCart,
    handleAddListToCart,
    handleCreateList,
    handleDeleteList,
    handleDeleteItem,
    handleQuantitySet,
    isAddingListToCart,
    listsQuery,
    newListTitle,
    openCreateListDialog,
    openDeleteListDialog,
    productsById,
    selectList,
    setNewListTitle,
    showCreateListDialog,
    sortedLists,
  }
}

export type AccountProductListsController = ReturnType<
  typeof useAccountProductLists
>
