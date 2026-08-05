import type { BadgeProps } from "@techsio/ui-kit/atoms/badge"
import type { Route } from "next"

import type { Product } from "@/types/product"

/**
 * Extract all common product display data
 */
interface ProductDisplayData {
  badges: BadgeProps[]
  displayBadges: BadgeProps[]
}

export function extractProductData(product: Product): ProductDisplayData {
  // For API products, find the price that matches the current currency
  const { primaryVariant } = product

  // Generate badges based on product data
  const badges: BadgeProps[] = []

  // New badge - check if product was created recently (within 7 days)
  if (product.created_at) {
    const createdDate = new Date(product.created_at)
    const daysSinceCreated =
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated <= 10) {
      badges.push({ children: "Nové", variant: "success" as const })
    }
  }

  if (primaryVariant) {
    if (!primaryVariant.manage_inventory) {
      badges.push({ children: "Skladem", variant: "success" as const })
    } else if (typeof primaryVariant.inventory_quantity === "number") {
      if (primaryVariant.inventory_quantity > 0) {
        badges.push({ children: "Skladem", variant: "success" as const })
      }
    } else if (primaryVariant.allow_backorder) {
      badges.push({ children: "Na objednávku", variant: "warning" as const })
    } else {
      badges.push({ children: "Vyprodáno", variant: "danger" as const })
    }
  }
  if (!primaryVariant) {
    badges.push({ children: "Vyprodáno", variant: "danger" as const })
  }
  return {
    badges,
    displayBadges: badges,
  }
}

/**
 * Get product URL path
 */
export function getProductPath(handle: string): Route<`/products/${string}`> {
  return `/products/${handle}`
}
