import type { MedusaCatalogProduct } from "@techsio/storefront-data/catalog/medusa-service"

export interface AddProductToCartInput {
  product: Pick<MedusaCatalogProduct, "id" | "metadata" | "title" | "variants">
  quantity?: number
  variantId?: string | null
}
