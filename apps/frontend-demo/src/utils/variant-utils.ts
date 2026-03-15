import type { ProductVariant } from "@/types/product"

const SIZE_ORDER = ["xs", "s", "m", "l", "xl", "2x", "3x", "4x"]

export function sortVariantsBySize(
  variants: ProductVariant[]
): ProductVariant[] {
  return [...variants].sort((a, b) => {
    const aTitle = a.title?.toLowerCase() ?? ""
    const bTitle = b.title?.toLowerCase() ?? ""
    const aIndex = SIZE_ORDER.indexOf(aTitle)
    const bIndex = SIZE_ORDER.indexOf(bTitle)

    // Pokud není v seznamu velikostí, dát na konec a řadit alfabeticky
    if (aIndex === -1 && bIndex === -1) {
      return aTitle.localeCompare(bTitle)
    }
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1

    return aIndex - bIndex
  })
}

export function isVariantInStock(
  variant: ProductVariant | null | undefined
): boolean {
  if (!variant) {
    return false
  }

  if (variant.allow_backorder) {
    return true
  }

  if (variant.manage_inventory === false) {
    return true
  }

  if (typeof variant.inventory_quantity === "number") {
    return variant.inventory_quantity > 0
  }

  return false
}

export function getDefaultVariant(
  variants: ProductVariant[] | null | undefined
): ProductVariant | null {
  if (!variants?.length) {
    return null
  }

  return variants.find((variant) => isVariantInStock(variant)) ?? variants[0]
}
