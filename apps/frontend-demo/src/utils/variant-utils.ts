import type { ProductVariant } from "@/types/product"

const SIZE_ORDER = ["xs", "s", "m", "l", "xl", "2x", "3x", "4x"]

export const sortVariantsBySize = (
  variants: ProductVariant[],
): ProductVariant[] =>
  variants.toSorted((a, b) => {
    const aTitle = a.title ?? ""
    const bTitle = b.title ?? ""
    const aIndex = SIZE_ORDER.indexOf(aTitle.toLowerCase())
    const bIndex = SIZE_ORDER.indexOf(bTitle.toLowerCase())

    // Pokud není v seznamu velikostí, dát na konec a řadit alfabeticky
    if (aIndex === -1 && bIndex === -1) {
      return aTitle.localeCompare(bTitle)
    }
    if (aIndex === -1) {
      return 1
    }
    if (bIndex === -1) {
      return -1
    }

    return aIndex - bIndex
  })
