"use client"

import type { HttpTypes } from "@medusajs/types"
import { resolveRelatedCategoryIds } from "@/lib/storefront/category-tree"
import { asStorefrontString } from "@/lib/storefront/product-pricing"
import {
  PRODUCT_CARD_FIELDS,
  PRODUCT_DETAIL_FIELDS,
  useProducts,
} from "@/lib/storefront/products"
import {
  resolveRecommendedProductFamilyKey,
  selectRecommendedProductRepresentatives,
} from "@/lib/storefront/recommended-product-families"
import { useCartProductsByHandle } from "./use-cart-products-by-handle"

const CHECKOUT_INLINE_PRODUCTS_LIMIT = 10
const CHECKOUT_INLINE_PRODUCTS_CANDIDATE_LIMIT = 32

export function useCheckoutInlineProducts(
  cartItems: HttpTypes.StoreCartLineItem[]
) {
  const { isLoading: isCartProductsLoading, products: cartProducts } =
    useCartProductsByHandle(cartItems, PRODUCT_DETAIL_FIELDS)

  const seenCategoryIds = new Set<string>()

  const relatedCategoryIds = cartProducts.reduce<string[]>((ids, product) => {
    for (const categoryId of resolveRelatedCategoryIds(product)) {
      if (seenCategoryIds.has(categoryId)) {
        continue
      }

      seenCategoryIds.add(categoryId)
      ids.push(categoryId)
    }

    return ids
  }, [])

  const relatedProductsQuery = useProducts({
    page: 1,
    limit: CHECKOUT_INLINE_PRODUCTS_CANDIDATE_LIMIT,
    category_id: relatedCategoryIds.length > 0 ? relatedCategoryIds : undefined,
    order: "-created_at",
    fields: PRODUCT_CARD_FIELDS,
    enabled: relatedCategoryIds.length > 0,
  })

  const cartProductIds = new Set(
    cartProducts
      .map((product) => asStorefrontString(product.id))
      .filter((productId): productId is string => Boolean(productId))
  )
  const cartProductHandlesSet = new Set(
    cartProducts
      .map((product) => asStorefrontString(product.handle))
      .filter((productHandle): productHandle is string =>
        Boolean(productHandle)
      )
  )
  const cartFamilyKeys = new Set(
    cartProducts.map((product) => resolveRecommendedProductFamilyKey(product))
  )

  const filteredProducts = relatedProductsQuery.products.filter((product) => {
    const productId = asStorefrontString(product.id)
    if (productId && cartProductIds.has(productId)) {
      return false
    }

    const productHandle = asStorefrontString(product.handle)
    if (productHandle && cartProductHandlesSet.has(productHandle)) {
      return false
    }

    const productFamilyKey = resolveRecommendedProductFamilyKey(product)
    return !cartFamilyKeys.has(productFamilyKey)
  })

  const relatedProducts = selectRecommendedProductRepresentatives(
    filteredProducts,
    CHECKOUT_INLINE_PRODUCTS_LIMIT
  )

  const isLoading = isCartProductsLoading || relatedProductsQuery.isLoading

  return {
    isLoading,
    products: relatedProducts,
  }
}
