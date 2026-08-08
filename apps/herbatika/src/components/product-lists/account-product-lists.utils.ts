import type { HttpTypes } from "@medusajs/types"

import {
  getProductListTitle,
  isFavoriteProductList,
} from "@/lib/storefront/product-lists"
import type {
  StoreProductList,
  StoreProductListItem,
} from "@/lib/storefront/product-lists"

export const sortProductLists = (
  lists: StoreProductList[],
  labels: { favorite: string; untitled: string },
) =>
  lists.toSorted((first, second) => {
    if (isFavoriteProductList(first)) {
      return -1
    }

    if (isFavoriteProductList(second)) {
      return 1
    }

    return getProductListTitle(first, labels).localeCompare(
      getProductListTitle(second, labels),
    )
  })

export const uniqueProductIds = (items: StoreProductListItem[]) => [
  ...new Set(
    items
      .map((item) => item.product_id ?? item.product?.id)
      .filter((id): id is string => id !== undefined && id !== ""),
  ),
]

export const buildProductMap = (
  items: StoreProductListItem[],
  products: HttpTypes.StoreProduct[],
) => {
  const map = new Map<string, HttpTypes.StoreProduct>()

  for (const item of items) {
    const itemProduct = item.product
    const productId = itemProduct?.id
    if (
      itemProduct !== null &&
      itemProduct !== undefined &&
      productId !== undefined &&
      productId !== ""
    ) {
      map.set(productId, itemProduct)
    }
  }

  for (const product of products) {
    map.set(product.id, product)
  }

  return map
}

export const resolveProductListItemQuantity = (item: StoreProductListItem) =>
  typeof item.quantity === "number" && item.quantity > 0
    ? Math.floor(item.quantity)
    : 1
