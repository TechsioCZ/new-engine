import type { HttpTypes } from "@medusajs/types"

type ProductWithSearchResult = HttpTypes.StoreProduct & {
  search_result?: Record<string, unknown>
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value)

const isDiscountedVariant = (variant: HttpTypes.StoreProductVariant) => {
  const calculatedAmount = variant.calculated_price?.calculated_amount
  const originalAmount = variant.calculated_price?.original_amount

  return (
    isFiniteNumber(calculatedAmount) &&
    isFiniteNumber(originalAmount) &&
    originalAmount > calculatedAmount
  )
}

export const prioritizeDiscountedVariant = (
  product: HttpTypes.StoreProduct
): HttpTypes.StoreProduct => {
  const variants = product.variants ?? []
  const discountedVariantIndex = variants.findIndex(isDiscountedVariant)

  if (discountedVariantIndex < 0) {
    return product
  }

  const discountedVariant = variants[discountedVariantIndex]
  const productWithSearchResult = product as ProductWithSearchResult
  const searchResult = { ...(productWithSearchResult.search_result ?? {}) }

  if (searchResult.variant_id !== discountedVariant.id) {
    delete searchResult.variant_title
  }
  searchResult.variant_id = discountedVariant.id

  return {
    ...product,
    search_result: searchResult,
    variants:
      discountedVariantIndex === 0
        ? variants
        : [
            discountedVariant,
            ...variants.filter(
              (_variant, index) => index !== discountedVariantIndex
            ),
          ],
  } as ProductWithSearchResult
}
