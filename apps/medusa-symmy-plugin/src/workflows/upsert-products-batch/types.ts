export type ProductIdentifierType = "sku" | "ean" | "erp_id"
export type VariantIdentifierType = "sku" | "ean" | "variant_id"

export type PriceInput = {
  currency_code: string
  amount: number
}

export type CategoryRefInput = {
  handle?: string
  name?: string
}

export type ImageInput = {
  url: string
}

export type VariantInput = {
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

export type ProductInput = {
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

export type UpsertProductsBatchInput = {
  products: ProductInput[]
}

export type UpsertProductsBatchResult = {
  identifier_type: ProductIdentifierType
  sku?: string
  ean?: string
  erp_id?: string
  status: "created" | "updated" | "failed"
  product_id?: string
  variant_ids?: string[]
  error?: string
}

export type UpsertProductsBatchOutput = {
  success: boolean
  processed: number
  failed: number
  results: UpsertProductsBatchResult[]
}
