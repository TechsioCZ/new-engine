import type { HttpTypes } from "@medusajs/types"

import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"

import { resolveProductListItemQuantity } from "./account-product-lists.utils"

type ProductListItemStockStatus = "limited_stock" | "out_of_stock"
type ProductListItemAvailabilityStatus =
  | ProductListItemStockStatus
  | "product_unavailable"

export interface ProductListItemAvailability {
  availableQuantity: number | null
  badgeVariant: "danger" | "warning"
  canAddToCart: boolean
  status: ProductListItemAvailabilityStatus | null
}

interface ProductListAvailableItem {
  item: StoreProductListItem
  product: HttpTypes.StoreProduct
}

export interface ProductListAvailabilitySummary {
  canAddAnyToCart: boolean
  canAddWholeList: boolean
  purchasableItems: ProductListAvailableItem[]
  skippedCount: number
}

export const resolveProductListItemProduct = (
  item: StoreProductListItem,
  productsById: Map<string, HttpTypes.StoreProduct>,
) => {
  const productId = item.product_id ?? item.product?.id

  if (productId === undefined || productId === "") {
    return item.product ?? null
  }

  return productsById.get(productId) ?? item.product ?? null
}

export const resolveProductListItemVariant = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct,
) => {
  const variants = product.variants ?? []
  const variantId = item.variant_id ?? item.variant?.id ?? null

  if (variantId !== null && variantId !== "") {
    const matchingVariant = variants.find((variant) => variant.id === variantId)
    if (matchingVariant !== undefined) {
      return matchingVariant
    }
  }

  return variants[0] ?? null
}

export const resolveProductListItemAvailability = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct | null,
): ProductListItemAvailability => {
  if (product === null) {
    return {
      availableQuantity: null,
      badgeVariant: "danger",
      canAddToCart: false,
      status: "product_unavailable",
    }
  }

  const quantity = resolveProductListItemQuantity(item)
  const variant = resolveProductListItemVariant(item, product)
  const inventory = resolveVariantInventoryState(variant, quantity)

  if (!(inventory.hasVariant && inventory.hasPrice)) {
    return {
      availableQuantity: null,
      badgeVariant: "danger",
      canAddToCart: false,
      status: "product_unavailable",
    }
  }

  if (!inventory.isInStock) {
    return {
      availableQuantity: inventory.availableQuantity,
      badgeVariant: "warning",
      canAddToCart: false,
      status: "out_of_stock",
    }
  }

  if (!inventory.isPurchasable) {
    return {
      availableQuantity: inventory.availableQuantity,
      badgeVariant: "warning",
      canAddToCart: false,
      status:
        inventory.availableQuantity === null ? "out_of_stock" : "limited_stock",
    }
  }

  return {
    availableQuantity: inventory.availableQuantity,
    badgeVariant: "warning",
    canAddToCart: true,
    status: null,
  }
}

export const resolveProductListAvailabilitySummary = (params: {
  items: StoreProductListItem[]
  productsById: Map<string, HttpTypes.StoreProduct>
}): ProductListAvailabilitySummary => {
  const purchasableItems: ProductListAvailableItem[] = []
  let skippedCount = 0

  for (const item of params.items) {
    const product = resolveProductListItemProduct(item, params.productsById)
    const availability = resolveProductListItemAvailability(item, product)

    if (availability.canAddToCart && product !== null) {
      purchasableItems.push({ item, product })
    } else {
      skippedCount += 1
    }
  }

  const canAddAnyToCart = purchasableItems.length > 0

  return {
    canAddAnyToCart,
    canAddWholeList: params.items.length > 0 && skippedCount === 0,
    purchasableItems,
    skippedCount,
  }
}
