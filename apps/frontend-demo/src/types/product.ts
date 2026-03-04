import type { HttpTypes } from "@medusajs/types"

export type ProductVariant = HttpTypes.StoreProductVariant

export type Product = HttpTypes.StoreProduct & {
  rating?: number
  reviewCount?: number
  features?: string[]
  specifications?: { name: string; value: string }[]
  inStock?: boolean
  price?: number | null
  priceWithTax?: number | null
  primaryVariant?: ProductVariant | null
}

export interface HomeCategory {
  name: string
  leaves: string[]
  imageUrl: string
  description: string
}
