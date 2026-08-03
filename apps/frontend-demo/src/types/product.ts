import type { HttpTypes } from "@medusajs/types"

type ProductImage = HttpTypes.StoreProductImage & { alt?: string }

export interface Product extends Omit<
  HttpTypes.StoreProduct,
  "images" | "variants"
> {
  images?: ProductImage[] | null
  variants?: ProductVariant[] | null
  rating?: number
  reviewCount?: number
  features?: string[]
  specifications?: { name: string; value: string }[]
  // Computed properties from transformProduct
  inStock: boolean
  price: number | undefined
  priceWithTax: number | undefined
  primaryVariant: ProductVariant | undefined
}

export interface HomeCategory {
  name: string
  leaves: string[]
  imageUrl: string
  description: string
}

export interface ProductVariant extends Omit<
  HttpTypes.StoreProductVariant,
  "inventory_quantity"
> {
  inventory_quantity?: number | null // deprecated, keeping for backward compatibility
  colorHex?: string
}
