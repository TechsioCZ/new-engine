"use client"

import {
  getProductListItems,
  useProductList,
  useProductLists,
} from "@/lib/storefront/product-lists"
import { PRODUCT_CARD_FIELDS, useProducts } from "@/lib/storefront/products"

import {
  resolveActiveList,
  resolveActiveListId,
  shouldLoadProductListProducts,
} from "./account-product-list-controller.utils"
import {
  buildProductMap,
  sortProductLists,
  uniqueProductIds,
} from "./account-product-lists.utils"
import { resolveProductListAvailabilitySummary } from "./product-list-availability"
import { resolveProductListPriceSummary } from "./product-list-pricing"

interface UseAccountProductListDataInput {
  currencyCode: string
  customerId: string | null
  isAuthenticated: boolean
  labels: { favorite: string; untitled: string }
  regionId: string | undefined
  requestedListId: string | null
  selectedListId: string | null
}

export const useAccountProductListData = ({
  currencyCode,
  customerId,
  isAuthenticated,
  labels,
  regionId,
  requestedListId,
  selectedListId,
}: UseAccountProductListDataInput) => {
  const listsQuery = useProductLists({
    customerId,
    enabled: isAuthenticated,
    limit: 100,
  })
  const sortedLists = sortProductLists(listsQuery.productLists, labels)
  const activeListId = resolveActiveListId(
    sortedLists,
    requestedListId,
    selectedListId,
  )
  const activeListQuery = useProductList(activeListId, {
    customerId,
    enabled: isAuthenticated && activeListId !== null && activeListId !== "",
  })
  const activeList = resolveActiveList(
    sortedLists,
    activeListQuery.productList,
    activeListId,
  )
  const activeItems = getProductListItems(activeList)
  const productIds = uniqueProductIds(activeItems)
  const productIdsFilter = productIds.length === 0 ? undefined : productIds
  const productsQuery = useProducts({
    enabled: shouldLoadProductListProducts(
      regionId,
      activeListId,
      productIds.length,
    ),
    fields: PRODUCT_CARD_FIELDS,
    ...(productIdsFilter === undefined ? {} : { id: productIdsFilter }),
    limit: Math.max(productIds.length, 1),
    page: 1,
  })
  const productsById = buildProductMap(activeItems, productsQuery.products)
  const activeProductsAreLoading =
    productsQuery.isLoading &&
    productIds.some((productId) => !productsById.has(productId))
  const activeListAvailabilitySummary = resolveProductListAvailabilitySummary({
    items: activeItems,
    productsById,
  })

  return {
    activeItems,
    activeList,
    activeListAvailabilitySummary,
    activeListId,
    activeListPriceSummary: resolveProductListPriceSummary({
      currencyCode,
      items: activeItems,
      productsById,
    }),
    activeListQuery,
    activeListSupportsQuantity: activeList !== null,
    activeProductsAreLoading,
    listsQuery,
    productsById,
    sortedLists,
  }
}
