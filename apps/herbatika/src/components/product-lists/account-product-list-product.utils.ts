import type { HttpTypes } from "@medusajs/types"

import type {
  StoreProductList,
  StoreProductListItem,
} from "@/lib/storefront/product-lists"
import {
  getProductListTitle,
  isFavoriteProductList,
} from "@/lib/storefront/product-lists"

export const sortProductLists = (lists: StoreProductList[]) =>
  [...lists].sort((first, second) => {
    if (isFavoriteProductList(first)) {
      return -1
    }
    if (isFavoriteProductList(second)) {
      return 1
    }
    return getProductListTitle(first).localeCompare(getProductListTitle(second))
  })

export const uniqueProductIds = (items: StoreProductListItem[]) =>
  Array.from(
    new Set(
      items
        .map((item) => item.product_id ?? item.product?.id)
        .filter((id): id is string => Boolean(id))
    )
  )

export const buildProductMap = (
  items: StoreProductListItem[],
  products: HttpTypes.StoreProduct[]
) => {
  const map = new Map<string, HttpTypes.StoreProduct>()
  for (const item of items) {
    if (item.product?.id) {
      map.set(item.product.id, item.product)
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

export const resolveProductListItemProduct = (
  item: StoreProductListItem,
  productsById: Map<string, HttpTypes.StoreProduct>
) => {
  const productId = item.product_id ?? item.product?.id
  return productId
    ? (productsById.get(productId) ?? item.product ?? null)
    : (item.product ?? null)
}

export const resolveProductListItemVariant = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct
) => {
  const variants = product.variants ?? []
  const variantId = item.variant_id ?? item.variant?.id ?? null
  return (
    (variantId ? variants.find((variant) => variant.id === variantId) : null) ??
    variants[0] ??
    null
  )
}
