import type { HttpTypes } from "@medusajs/types"
import type { SelectItem } from "@techsio/ui-kit/molecules/select"

import type {
  Product,
  ProductOfferState,
} from "@/components/product-detail/product-detail.types"

export interface ProductDetailPurchasePanelProps {
  canAddToCart: boolean
  currentAmountLabel: string
  displayOriginalLabel: string | null
  isAdding: boolean
  maxQuantity: number
  offerState: ProductOfferState
  onAddToCart: () => void
  onQuantityChange: (quantity: number) => void
  onVariantChange: (variantId: string | null) => void
  product: Product
  productCategories: HttpTypes.StoreProductCategory[]
  productHighlights: string[]
  quantity: number
  selectedVariantId: string | null
  unitPriceLabel: string | null
  variantItems: SelectItem[]
  vipCreditLabel: string | null
}
