"use client"

import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"

import type { Product } from "@/components/product-detail/product-detail.types"
import { useAuth } from "@/lib/storefront/auth"
import {
  useProductListDetails,
  useProductLists,
} from "@/lib/storefront/product-lists"

import {
  buildProductListPickerRows,
  hydrateProductLists,
} from "./product-list-picker-rows"
import { useProductListPickerActions } from "./use-product-list-picker-actions"
import { useProductListPickerState } from "./use-product-list-picker-state"

interface UseProductListPickerInput {
  product: Product
  quantity: number
  selectedVariantId: string | null
}

export const useProductListPicker = ({
  product,
  quantity,
  selectedVariantId,
}: UseProductListPickerInput) => {
  const tAuth = useTranslations("auth")
  const pathname = usePathname()
  const authQuery = useAuth()
  const state = useProductListPickerState()
  const customerId = authQuery.customer?.id ?? null
  const shouldFetchLists = state.isOpen && authQuery.isAuthenticated
  const listsQuery = useProductLists({
    customerId,
    enabled: shouldFetchLists,
    limit: 100,
  })
  const listIds = listsQuery.productLists.flatMap((list) =>
    list.id === "" ? [] : [list.id],
  )
  const detailQueries = useProductListDetails(listIds, {
    customerId,
    enabled: shouldFetchLists && listIds.length > 0,
  })
  const hydratedLists = hydrateProductLists(
    listsQuery.productLists,
    detailQueries.map((query) => query.data),
  )
  const rows = buildProductListPickerRows({
    favoriteTitle: tAuth("product_lists.favorite_title"),
    lists: hydratedLists,
    productId: product.id,
    selectedVariantId,
    untitledListTitle: tAuth("product_lists.untitled_list"),
  })
  const actions = useProductListPickerActions({
    clearNewListForm: state.clearNewListForm,
    newListTitle: state.newListTitle,
    product,
    quantity,
    selectedVariantId,
    setActiveListKey: state.setActiveListKey,
  })

  const retryLists = async () => {
    await Promise.all([
      listsQuery.query.refetch(),
      ...detailQueries.map(async (query) => await query.refetch()),
    ])
  }

  return {
    activeListKey: state.activeListKey,
    addProductToList: actions.addProductToList,
    authQuery,
    detailsAreLoading:
      listIds.length > 0 && detailQueries.some((query) => query.isLoading),
    detailsHaveError: detailQueries.some((query) => query.error !== null),
    handleCreateList: actions.handleCreateList,
    isMutating: actions.isMutating,
    isOpen: state.isOpen,
    listsQuery,
    loginHref: `/auth/login?next=${encodeURIComponent(pathname)}`,
    newListTitle: state.newListTitle,
    retryLists,
    rows,
    setIsOpen: state.setIsOpen,
    setNewListTitle: state.setNewListTitle,
    setShowNewListInput: state.setShowNewListInput,
    showNewListInput: state.showNewListInput,
  }
}

export type ProductListPickerController = ReturnType<
  typeof useProductListPicker
>
