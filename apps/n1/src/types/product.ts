import type { StoreProduct } from "@medusajs/types"
import type { BadgeProps } from "@techsio/ui-kit/atoms/badge"

export interface StoreProductExtended extends StoreProduct {
  brand?: Brand
}

export interface ProductListCalculatedPrice {
  calculated_amount_with_tax?: number | null
  calculated_amount_without_tax?: number | null
  currency_code: string | null
}

export interface ProductListVariant {
  calculated_price?: ProductListCalculatedPrice | null
  inventory_quantity?: number | null
  title: string | null
}

export interface ProductListProduct {
  handle: string
  id: string
  thumbnail: string | null
  title: string
  variants: ProductListVariant[] | null
}

// Lightweight type for product listing
type StockStatus = keyof {
  "in-stock": true
  "limited-stock": true
  "out-of-stock": true
}

export interface Product {
  id: string
  title: string
  handle: string
  price?: string
  withoutTax?: string
  badges?: BadgeProps[]
  imageSrc?: string
  stockStatus?: StockStatus
  stockValue?: "Skladem" | "Vyprodáno"
  variants?: string[]
}

// Product image from Medusa
export interface ProductImage {
  id: string
  src: string
}

// Product option value

// Product option

// Brand information
export interface Brand {
  id: string
  title: string
  attributes?: {
    value: string
    attributeType?:
      | {
          name: string
        }
      | undefined
  }[]
}

export interface ProductVariantDetail {
  id: string
  title: string
  sku?: string | null
  barcode?: string | null
  ean?: string | null
  upc?: string | null
  material?: string | null
  allow_backorder: boolean
  manage_inventory: boolean
  inventory_quantity?: number | undefined
  metadata?:
    | {
        images?: { url: string }[]
        thumbnail?: string
        user_code?: string
        attributes?: { name: string; value: string }[]
      }
    | undefined
  calculated_price?:
    | {
        calculated_amount?: number | null | undefined
        calculated_amount_with_tax?: number | null | undefined
        calculated_amount_without_tax?: number | null | undefined
        original_amount?: number | null | undefined
        currency_code?: string | null | undefined
      }
    | undefined
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
  tags?: { id: string; value: string }[]
  brand?: Brand | undefined
}
