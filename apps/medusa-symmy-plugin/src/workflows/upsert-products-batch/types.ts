export type ProductIdentifierType = "sku" | "ean" | "erp_id"
export type VariantIdentifierType = "sku" | "ean" | "variant_id"

export interface PriceInput {
  currency_code: string
  amount: number
}

export interface CategoryRefInput {
  handle?: string
  name?: string
}

export interface ImageInput {
  url: string
}

export interface VariantInput {
  identifier_type: VariantIdentifierType
  sku?: string
  ean?: string
  variant_id?: string
  title: string
  manage_inventory?: boolean
  vat_rate?: number
  prices?: PriceInput[]
  options?: Record<string, string | number>
  metadata?: Record<string, unknown>
}

export interface ProductInput {
  identifier_type: ProductIdentifierType
  sku?: string
  ean?: string
  erp_id?: string
  title: string
  subtitle?: string
  description?: string
  handle?: string
  status?: "published" | "draft"
  discountable?: boolean
  weight?: number
  hs_code?: string
  categories?: CategoryRefInput[]
  images?: ImageInput[]
  base_prices?: PriceInput[]
  variants?: VariantInput[]
  metadata?: Record<string, unknown>
}

export interface UpsertProductsBatchInput {
  products: ProductInput[]
}

export interface UpsertProductsBatchResult {
  identifier_type: ProductIdentifierType
  sku?: string
  ean?: string
  erp_id?: string
  status: "created" | "updated" | "failed"
  product_id?: string
  variant_ids?: string[]
  error?: string
}

export interface UpsertProductsBatchOutput {
  success: boolean
  processed: number
  failed: number
  results: UpsertProductsBatchResult[]
}
