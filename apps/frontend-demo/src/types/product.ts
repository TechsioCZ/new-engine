import type { HttpTypes } from "@medusajs/types"

export type Product = HttpTypes.StoreProduct & {
  rating?: number
  reviewCount?: number
  features?: string[]
  specifications?: { name: string; value: string }[]
  inStock?: boolean
  price?: number | null
  priceWithTax?: number | null
  primaryVariant?: HttpTypes.StoreProductVariant | null
}

export type ProductImage = HttpTypes.StoreProductImage
export type ProductCollection = HttpTypes.StoreCollection
export type ProductCategory = HttpTypes.StoreProductCategory
export type ProductVariant = HttpTypes.StoreProductVariant
export type ProductPrice = NonNullable<HttpTypes.StoreProductVariant["calculated_price"]>
export type ProductOption = HttpTypes.StoreProductOption

export interface HomeCategory {
  name: string
  leaves: string[]
  imageUrl: string
  description: string
}
