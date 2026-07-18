import type { HttpTypes } from "@medusajs/types"

import { resolveVariantInventoryState } from "@/lib/storefront/product-availability"
import type { StoreProductListItem } from "@/lib/storefront/product-lists"

import {
  resolveProductListItemProduct,
  resolveProductListItemQuantity,
  resolveProductListItemVariant,
} from "./account-product-list-product.utils"

export {
  buildProductMap,
  resolveProductListItemQuantity,
  sortProductLists,
  uniqueProductIds,
} from "./account-product-list-product.utils"
export { resolveProductListPriceSummary } from "./account-product-list-pricing.utils"

export type ProductListItemAvailability = {
  badgeLabel: string | null
  badgeVariant: "danger" | "warning"
  canAddToCart: boolean
}

type ProductListAvailableItem = {
  item: StoreProductListItem
  product: HttpTypes.StoreProduct
}

export type ProductListAvailabilitySummary = {
  addToCartLabel: string
  canAddAnyToCart: boolean
  canAddWholeList: boolean
  purchasableItems: ProductListAvailableItem[]
  skippedCount: number
  statusLabel: string | null
  statusVariant: "danger" | "warning"
}

export const resolveProductListItemAvailability = (
  item: StoreProductListItem,
  product: HttpTypes.StoreProduct | null
): ProductListItemAvailability => {
  if (!product) {
    return {
      badgeLabel: "Produkt nie je dostupný",
      badgeVariant: "danger",
      canAddToCart: false,
    }
  }

  const inventory = resolveVariantInventoryState(
    resolveProductListItemVariant(item, product),
    resolveProductListItemQuantity(item)
  )

  if (!(inventory.hasVariant && inventory.hasPrice)) {
    return {
      badgeLabel: "Produkt nie je dostupný",
      badgeVariant: "danger",
      canAddToCart: false,
    }
  }
  if (!inventory.isInStock) {
    return {
      badgeLabel: "Momentálne nie je skladom",
      badgeVariant: "warning",
      canAddToCart: false,
    }
  }
  if (!inventory.isPurchasable) {
    return {
      badgeLabel:
        inventory.availableQuantity === null
          ? "Momentálne nie je skladom"
          : `Dostupné len ${inventory.availableQuantity} ks`,
      badgeVariant: "warning",
      canAddToCart: false,
    }
  }

  return { badgeLabel: null, badgeVariant: "warning", canAddToCart: true }
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
    if (availability.canAddToCart && product) {
      purchasableItems.push({ item, product })
    } else {
      skippedCount += 1
    }
  }

  const canAddAnyToCart = purchasableItems.length > 0
  const canAddWholeList = params.items.length > 0 && skippedCount === 0
  let addToCartLabel = "Žiadne dostupné položky"
  if (canAddWholeList) {
    addToCartLabel = "Pridať všetko do košíka"
  } else if (canAddAnyToCart) {
    addToCartLabel = "Pridať dostupné do košíka"
  }

  return {
    addToCartLabel,
    canAddAnyToCart,
    canAddWholeList,
    purchasableItems,
    skippedCount,
    statusLabel:
      skippedCount > 0
        ? `Momentálne nedostupné položky: ${skippedCount}`
        : null,
    statusVariant: canAddAnyToCart ? "warning" : "danger",
  }
}
