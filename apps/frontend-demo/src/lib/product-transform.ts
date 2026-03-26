import type { HttpTypes } from "@medusajs/types"
import { findPreferredVariant } from "@/lib/inventory"
import type { Product } from "@/types/product"

export const transformProduct = (
  product: HttpTypes.StoreProduct,
  withVariants = true
): Product => {
  if (!product) {
    throw new Error("Cannot transform null product")
  }

  const primaryVariant = findPreferredVariant(product.variants)
  const price = primaryVariant?.calculated_price?.calculated_amount
  const priceWithTax =
    primaryVariant?.calculated_price?.calculated_amount_with_tax
  const inStock = true

  const reducedImages =
    product.images && product.images.length > 2 && product.images.slice(0, 2)

  const productWithoutVariants = { ...product }
  productWithoutVariants.variants = undefined

  const result = withVariants ? product : productWithoutVariants

  return {
    ...result,
    thumbnail: product.thumbnail,
    images: reducedImages || product.images,
    inStock,
    price,
    priceWithTax,
    primaryVariant,
  } as Product
}
