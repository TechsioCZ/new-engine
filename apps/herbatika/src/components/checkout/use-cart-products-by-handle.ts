"use client"

import type { HttpTypes } from "@medusajs/types"
import { PRODUCT_CARD_FIELDS, useProducts } from "@/lib/storefront/products"

export const resolveCartProductIds = (
  cartItems: HttpTypes.StoreCartLineItem[]
) => {
  const seenIds = new Set<string>()

  return cartItems.reduce<string[]>((productIds, item) => {
    if (!(item.product_id && !seenIds.has(item.product_id))) {
      return productIds
    }

    seenIds.add(item.product_id)
    productIds.push(item.product_id)
    return productIds
  }, [])
}

export function useCartProductsById(
  cartItems: HttpTypes.StoreCartLineItem[],
  fields = PRODUCT_CARD_FIELDS
) {
  const productIds = resolveCartProductIds(cartItems)
  const productsQuery = useProducts({
    page: 1,
    limit: Math.max(productIds.length, 1),
    id: productIds.length > 0 ? productIds : undefined,
    fields,
    enabled: productIds.length > 0,
  })
  const expectedIds = new Set(productIds)
  const products = productsQuery.products.filter((product) =>
    expectedIds.has(product.id)
  )

  const productsById = new Map<string, HttpTypes.StoreProduct>()

  for (const product of products) {
    productsById.set(product.id, product)
  }

  return {
    isLoading: productsQuery.isLoading,
    productIds,
    products,
    productsById,
  }
}
