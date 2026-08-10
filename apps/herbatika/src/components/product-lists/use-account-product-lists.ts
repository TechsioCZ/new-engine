"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

import { useAuth } from "@/lib/storefront/auth"
import { resolveRegionCurrency } from "@/lib/storefront/region-selection"

import { useAccountProductListCart } from "./use-account-product-list-cart"
import { useAccountProductListData } from "./use-account-product-list-data"
import { useAccountProductListDialogs } from "./use-account-product-list-dialogs"
import { useAccountProductListItems } from "./use-account-product-list-items"

type AccountProductListDataController = ReturnType<
  typeof useAccountProductListData
>
type AccountProductListDialogsController = ReturnType<
  typeof useAccountProductListDialogs
>
type AccountProductListItemsController = ReturnType<
  typeof useAccountProductListItems
>

export type AccountProductListsController = Pick<
  AccountProductListDataController,
  | "activeItems"
  | "activeList"
  | "activeListAvailabilitySummary"
  | "activeListId"
  | "activeListPriceSummary"
  | "activeListQuery"
  | "activeListSupportsQuantity"
  | "activeProductsAreLoading"
  | "listsQuery"
  | "productsById"
  | "sortedLists"
> &
  Pick<
    AccountProductListDialogsController,
    | "closeCreateListDialog"
    | "closeDeleteListDialog"
    | "createListMutation"
    | "deleteList"
    | "deleteListMutation"
    | "handleCreateList"
    | "handleDeleteList"
    | "newListTitle"
    | "openCreateListDialog"
    | "openDeleteListDialog"
    | "selectList"
    | "setNewListTitle"
    | "showCreateListDialog"
  > &
  ReturnType<typeof useAccountProductListCart> &
  Pick<
    AccountProductListItemsController,
    | "activeDeleteItemId"
    | "activeQuantitySetItemId"
    | "handleDeleteItem"
    | "handleQuantitySet"
  >

export const useAccountProductLists = (): AccountProductListsController => {
  const tAuth = useTranslations("auth")
  const authQuery = useAuth()
  const region = useRegionContext()
  const searchParams = useSearchParams()
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const customerId = authQuery.customer?.id ?? null
  const regionId = region?.region_id
  const countryCode = region?.country_code

  const data = useAccountProductListData({
    currencyCode: resolveRegionCurrency(region),
    customerId,
    isAuthenticated: authQuery.isAuthenticated,
    labels: {
      favorite: tAuth("product_lists.favorite_title"),
      untitled: tAuth("product_lists.untitled_list"),
    },
    regionId,
    requestedListId: searchParams.get("list"),
    selectedListId,
  })
  const dialogs = useAccountProductListDialogs({
    activeListId: data.activeListId,
    setSelectedListId,
    sortedLists: data.sortedLists,
  })
  const cart = useAccountProductListCart({
    activeList: data.activeList,
    availabilitySummary: data.activeListAvailabilitySummary,
    countryCode,
    customerEmail: authQuery.customer?.email,
    regionId,
  })
  const items = useAccountProductListItems({
    activeList: data.activeList,
    supportsQuantity: data.activeListSupportsQuantity,
  })

  return {
    activeDeleteItemId: items.activeDeleteItemId,
    activeItems: data.activeItems,
    activeList: data.activeList,
    activeListAvailabilitySummary: data.activeListAvailabilitySummary,
    activeListCanCreateCart: cart.activeListCanCreateCart,
    activeListId: data.activeListId,
    activeListPriceSummary: data.activeListPriceSummary,
    activeListQuery: data.activeListQuery,
    activeListSupportsQuantity: data.activeListSupportsQuantity,
    activeProductId: cart.activeProductId,
    activeProductsAreLoading: data.activeProductsAreLoading,
    activeQuantitySetItemId: items.activeQuantitySetItemId,
    closeCreateListDialog: dialogs.closeCreateListDialog,
    closeDeleteListDialog: dialogs.closeDeleteListDialog,
    createListCartMutation: cart.createListCartMutation,
    createListMutation: dialogs.createListMutation,
    deleteList: dialogs.deleteList,
    deleteListMutation: dialogs.deleteListMutation,
    handleAddListToCart: cart.handleAddListToCart,
    handleAddToCart: cart.handleAddToCart,
    handleCreateList: dialogs.handleCreateList,
    handleDeleteItem: items.handleDeleteItem,
    handleDeleteList: dialogs.handleDeleteList,
    handleQuantitySet: items.handleQuantitySet,
    isAddingListToCart: cart.isAddingListToCart,
    listsQuery: data.listsQuery,
    newListTitle: dialogs.newListTitle,
    openCreateListDialog: dialogs.openCreateListDialog,
    openDeleteListDialog: dialogs.openDeleteListDialog,
    productsById: data.productsById,
    selectList: dialogs.selectList,
    setNewListTitle: dialogs.setNewListTitle,
    showCreateListDialog: dialogs.showCreateListDialog,
    sortedLists: data.sortedLists,
  }
}
