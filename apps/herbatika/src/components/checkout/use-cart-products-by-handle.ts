"use client"

import type { HttpTypes } from "@medusajs/types"

import { resolveLineItemProductHandle } from "@/components/header/herbatika-cart-item.utils"
import { PRODUCT_CARD_FIELDS, useProducts } from "@/lib/storefront/products"

const resolveCartProductHandles = (
  cartItems: HttpTypes.StoreCartLineItem[],
) => {
  const seenHandles = new Set<string>()

  const handles: string[] = []
  for (const item of cartItems) {
    const productHandle = resolveLineItemProductHandle(item)
    if (
      productHandle === undefined ||
      productHandle === null ||
      productHandle.length === 0 ||
      seenHandles.has(productHandle)
    ) {
      continue
    }

    seenHandles.add(productHandle)
    handles.push(productHandle)
  }
  return handles
}

export const useCartProductsByHandle = (
  cartItems: HttpTypes.StoreCartLineItem[],
  fields = PRODUCT_CARD_FIELDS,
) => {
  const productHandles = resolveCartProductHandles(cartItems)
  const productsQuery = useProducts({
    enabled: productHandles.length > 0,
    fields,
    ...(productHandles.length > 0 ? { handle: productHandles } : {}),
    limit: Math.max(productHandles.length, 1),
    page: 1,
  })
  const expectedHandles = new Set(productHandles)
  const products = productsQuery.products.filter(
    (product) =>
      typeof product.handle === "string" && expectedHandles.has(product.handle),
  )

  const productsByHandle = new Map<string, HttpTypes.StoreProduct>()

  for (const product of products) {
    if (typeof product.handle === "string") {
      productsByHandle.set(product.handle, product)
    }
  }

  return {
    isLoading: productsQuery.isLoading,
    productHandles,
    products,
    productsByHandle,
  }
}
