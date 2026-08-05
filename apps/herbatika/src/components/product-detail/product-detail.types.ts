import type { HttpTypes } from "@medusajs/types"
import type { StorePricePerUnit } from "@techsio/storefront-data/products/types"
import type { IconType } from "@techsio/ui-kit/atoms/icon"

export type Product = HttpTypes.StoreProduct

export interface ProductDetailProps {
  handle: string
}

export interface ProductPriceState {
  currentLabel: string
  originalLabel: string | null
  currentAmount: number | null
  originalAmount: number | null
  currencyCode: string
  pricePerUnit: StorePricePerUnit | null
}

export interface ProductOfferState {
  code: string | null
  ean: string | null
  availabilityLabel: string
  expectedDeliveryDate: Date | null
  stockAmount: number | null
  isInStock: boolean
  currentAmount: number | null
  standardAmount: number | null
  actionAmount: number | null
  hasActiveDiscount: boolean
  applyLoyaltyDiscount: boolean
  applyQuantityDiscount: boolean
  applyVolumeDiscount: boolean
}

export interface ProductMediaFact {
  id: "doses" | "daily-intake"
  icon: IconType
  value: string
  label: string
}

export interface ProductDetailContentSection {
  key: string
  title: string
  html: string
}

export interface VolumeDiscountOption {
  id: string
  title: string
  quantity: number
  totalAmountLabel: string
  perUnitLabel: string
  oldTotalAmountLabel: string | null
}

export interface RelatedProductsSection {
  id: string
  title: string
  products: Product[]
}
