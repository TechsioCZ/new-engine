import type { StoreProduct } from "@medusajs/types"
import type { BadgeProps } from "@techsio/ui-kit/atoms/badge"

export interface StoreProductExtended extends StoreProduct {
  brand?: Brand
}

// Lightweight type for product listing
export type Product = {
  id: string
  title: string
  handle: string
  price?: string
  withoutTax?: string
  badges?: BadgeProps[]
  imageSrc?: string
  stockStatus?: "in-stock" | "out-of-stock" | "limited-stock" | undefined
  stockValue?: "Skladem" | "Vyprodáno"
  variants?: string[]
}

// Product image from Medusa
export type ProductImage = {
  id: string
  src: string
}

// Product option value

// Product option

// Brand information
export type Brand = {
  id: string
  title: string
  attributes?: Array<{
    value: string
    attributeType?: {
      name: string
    }
  }>
}

export type ProductVariantDetail = {
  id: string
  title: string
  sku?: string | null
  barcode?: string | null
  ean?: string | null
  upc?: string | null
  material?: string | null
  allow_backorder: boolean
  manage_inventory: boolean
  inventory_quantity?: number
  metadata?: {
    images?: Array<{ url: string }>
    thumbnail?: string
    user_code?: string
    attributes?: Array<{ name: string; value: string }>
  }
  calculated_price?: {
    calculated_amount?: number | null
    calculated_amount_with_tax?: number | null
    calculated_amount_without_tax?: number | null
    original_amount?: number | null
    currency_code?: string | null
  }
}

export interface ProductDetail extends Omit<Product, "variants" | "images"> {
  description?: string | null
  subtitle?: string | null
  thumbnail?: string | null
  collection_id?: string | null
  type_id?: string | null
  weight?: string | number | null
  material?: string | null
  images: ProductImage[]
  variants: ProductVariantDetail[]
  tags?: Array<{ id: string; value: string }>
  brand?: Brand
}
