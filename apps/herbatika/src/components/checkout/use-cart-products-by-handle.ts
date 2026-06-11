"use client"

import type { HttpTypes } from "@medusajs/types"
import { useMemo } from "react"
import { resolveLineItemProductHandle } from "@/components/header/herbatika-cart-item.utils"
import { PRODUCT_CARD_FIELDS, useProducts } from "@/lib/storefront/products"

export const resolveCartProductHandles = (
  cartItems: HttpTypes.StoreCartLineItem[]
) => {
  const seenHandles = new Set<string>()

  return cartItems.reduce<string[]>((handles, item) => {
    const productHandle = resolveLineItemProductHandle(item)
    if (!productHandle || seenHandles.has(productHandle)) {
      return handles
    }

    seenHandles.add(productHandle)
    handles.push(productHandle)
    return handles
  }, [])
}

export function useCartProductsByHandle(
  cartItems: HttpTypes.StoreCartLineItem[],
  fields = PRODUCT_CARD_FIELDS
) {
  const productHandles = useMemo(
    () => resolveCartProductHandles(cartItems),
    [cartItems]
  )
  const productsQuery = useProducts({
    page: 1,
    limit: Math.max(productHandles.length, 1),
    handle: productHandles.length > 0 ? productHandles : undefined,
    fields,
    enabled: productHandles.length > 0,
  })
  const products = useMemo(() => {
    const expectedHandles = new Set(productHandles)

    return productsQuery.products.filter(
      (product) =>
        typeof product.handle === "string" &&
        expectedHandles.has(product.handle)
    )
  }, [productHandles, productsQuery.products])
  const productsByHandle = useMemo(() => {
    const nextProductsByHandle = new Map<string, HttpTypes.StoreProduct>()

    for (const product of products) {
      if (typeof product.handle === "string") {
        nextProductsByHandle.set(product.handle, product)
      }
    }

    return nextProductsByHandle
  }, [products])

  return {
    isLoading: productsQuery.isLoading,
    productHandles,
    products,
    productsByHandle,
  }
}
