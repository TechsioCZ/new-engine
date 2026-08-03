"use client"

import { useRegionContext } from "@techsio/storefront-data/shared/region-context"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useEffect, useState } from "react"
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
  resolveAddProductToCartErrorMessage,
  useAddProductToCart,
} from "@/lib/storefront/use-add-product-to-cart"

import {
  buildProductMap,
  resolveProductListAvailabilitySummary,
  resolveProductListPriceSummary,
  sortProductLists,
  uniqueProductIds,
} from "./account-product-lists.utils"

const MISSING_VARIANT_ERROR_PATTERN = /has no variant selected|no variant/i

type ListCartErrorMessages = {
  addListFailed: string
  allAvailableFailed: string
  missingVariant: string
  partiallyAvailableFailed: string
}

const resolveListCartErrorMessage = (
  error: unknown,
  messages: ListCartErrorMessages
) => {
  const errorMessage = resolveErrorMessage(error, messages.addListFailed)

  if (MISSING_VARIANT_ERROR_PATTERN.test(errorMessage)) {
    return messages.missingVariant
  }

  return errorMessage
}

const showPartialListCartResult = ({
  failedCount,
  messages,
  toast,
  totalCount,
}: {
  failedCount: number
  messages: ListCartErrorMessages
  toast: ReturnType<typeof useAppToast>
  totalCount: number
}) => {
  if (failedCount === 0) {
    return
  }

  if (failedCount === totalCount) {
    toast.error({
      title: messages.allAvailableFailed,
    })
    return
  }

  toast.warning({
    title: messages.partiallyAvailableFailed,
  })
}

export function useAccountProductLists() {
  const tAuth = useTranslations("auth")
  const tCart = useTranslations("cart")
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
  const sortedLists = sortProductLists(listsQuery.productLists, {
    favorite: tAuth("product_lists.favorite_title"),
    untitled: tAuth("product_lists.untitled_list"),
  })
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
      toast.warning({
        title: tAuth("product_lists.validation.title_required"),
      })
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
        title: resolveErrorMessage(
          error,
          tAuth("product_lists.errors.create_failed")
        ),
      })
    }
  }

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
        variantId: item.variant_id,
      })
    } catch (error) {
      toast.error({
        title: resolveAddProductToCartErrorMessage(error, tCart("failed")),
      })
    } finally {
      setActiveProductId(null)
    }
  }

  const addPurchasableItemsToCart = async () => {
    const { purchasableItems } = activeListAvailabilitySummary
    let failedCount = 0

    for (const purchasableItem of purchasableItems) {
      const { item, product } = purchasableItem

      setActiveProductId(product.id)

      try {
        await addToCart.addProductToCart({
          product,
          quantity: resolveProductListItemQuantity(item),
          variantId: item.variant_id,
        })
      } catch {
        failedCount += 1
      }
    }

    return {
      failedCount,
      totalCount: purchasableItems.length,
    }
  }

  const handleAddListToCart = async () => {
    if (!(activeList?.id && activeListAvailabilitySummary.canAddAnyToCart)) {
      return
    }

    if (!(region?.region_id || region?.country_code)) {
      toast.warning({
        title: tCart("missing_region"),
      })
      return
    }

    setIsAddingListToCart(true)

    try {
      if (activeListAvailabilitySummary.canAddWholeList) {
        await createListCartMutation.mutateAsync({
          listId: activeList.id,
          regionId: region.region_id,
          countryCode: region.country_code,
          email: authQuery.customer?.email,
        })
        return
      }

      const addResult = await addPurchasableItemsToCart()

      showPartialListCartResult({
        failedCount: addResult.failedCount,
        messages: {
          addListFailed: tAuth("product_lists.errors.add_list_to_cart_failed"),
          allAvailableFailed: tAuth(
            "product_lists.errors.add_available_all_failed"
          ),
          missingVariant: tAuth("product_lists.errors.missing_variant"),
          partiallyAvailableFailed: tAuth(
            "product_lists.errors.add_available_partial_failed"
          ),
        },
        toast,
        totalCount: addResult.totalCount,
      })
    } catch (error) {
      toast.error({
        title: resolveListCartErrorMessage(error, {
          addListFailed: tAuth("product_lists.errors.add_list_to_cart_failed"),
          allAvailableFailed: tAuth(
            "product_lists.errors.add_available_all_failed"
          ),
          missingVariant: tAuth("product_lists.errors.missing_variant"),
          partiallyAvailableFailed: tAuth(
            "product_lists.errors.add_available_partial_failed"
          ),
        }),
      })
    } finally {
      setActiveProductId(null)
      setIsAddingListToCart(false)
    }
  }

  const handleQuantitySet = async (
    item: StoreProductListItem,
    quantity: number
  ) => {
    if (!(item.id && activeListSupportsQuantity)) {
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
        title: resolveErrorMessage(
          error,
          tAuth("product_lists.errors.quantity_update_failed")
        ),
      })
    } finally {
      setActiveQuantitySetItemId(null)
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
        title: resolveErrorMessage(
          error,
          tAuth("product_lists.errors.delete_list_failed")
        ),
      })
    }
  }

  const handleDeleteItem = async (item: StoreProductListItem) => {
    if (!(activeList?.id && item.id)) {
      return
    }

    setActiveDeleteItemId(item.id)

    try {
      await deleteItemMutation.mutateAsync({
        listId: activeList.id,
        itemId: item.id,
      })
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(
          error,
          tAuth("product_lists.errors.remove_product_failed")
        ),
      })
    } finally {
      setActiveDeleteItemId(null)
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
