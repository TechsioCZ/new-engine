import type { ProductVariantDetail } from "@/types/product"

/**
 * Selects the appropriate variant based on URL parameter
 * @param variants - Array of product variants
 * @param variantParam - Variant name from URL query param
 * @returns Selected variant or null if no variants available
 */
export function selectVariant(
  variants: ProductVariantDetail[] | undefined,
  variantParam: string | null,
): ProductVariantDetail | null {
  if (!variants?.length) {
    return null
  }
  const [firstVariant] = variants

  // If variant param exists, try to find matching variant
  if (variantParam) {
    const found = variants.find(
      (v) => v.title.toLowerCase() === variantParam.toLowerCase(),
    )
    // Return found variant, or fallback to first variant
    return found ?? firstVariant ?? null
  }

  // Default to first variant when no param
  return firstVariant ?? null
}
