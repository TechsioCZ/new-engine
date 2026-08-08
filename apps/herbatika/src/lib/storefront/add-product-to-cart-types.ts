import type { HttpTypes } from "@medusajs/types"

export interface AddProductToCartInput {
  product: Pick<
    HttpTypes.StoreProduct,
    "id" | "metadata" | "title" | "variants"
  >
  quantity?: number
  variantId?: string | null
}
