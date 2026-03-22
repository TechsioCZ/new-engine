import type { BadgeProps } from "@techsio/ui-kit/atoms/badge"
import { getVariantInventory } from "@/lib/inventory"
import type { Product } from "@/types/product"

/**
 * Extract all common product display data
 */
type ProductDisplayData = {
  badges: BadgeProps[]
  displayBadges: BadgeProps[]
}

export function extractProductData(
  product: Product,
  _currencyCode?: string
): ProductDisplayData {
  // For API products, find the price that matches the current currency
  const primaryVariant = product.primaryVariant

  // Generate badges based on product data
  const badges: BadgeProps[] = []

  // New badge - check if product was created recently (within 7 days)
  if (product.created_at) {
    const createdDate = new Date(product.created_at)
    const daysSinceCreated =
      (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated <= 10) {
      badges.push({ variant: "success" as const, children: "Nové" })
    }
  }

  if (primaryVariant) {
    const inventory = getVariantInventory(primaryVariant)

    if (inventory.status === "out-of-stock") {
      badges.push({ variant: "danger" as const, children: "Vyprodáno" })
    } else if (
      primaryVariant.manage_inventory &&
      primaryVariant.allow_backorder &&
      typeof primaryVariant.inventory_quantity === "number" &&
      primaryVariant.inventory_quantity <= 0
    ) {
      badges.push({ variant: "warning" as const, children: "Na objednávku" })
    } else {
      badges.push({ variant: "success" as const, children: "Skladem" })
    }
  } else {
    badges.push({ variant: "danger" as const, children: "Vyprodáno" })
  }
  return {
    badges,
    displayBadges: badges,
  }
}

/**
 * Get product URL path
 */
export function getProductPath(handle: string): string {
  return `/products/${handle}`
}
