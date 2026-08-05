export type PriceIdentifierType = "sku" | "ean" | "variant_id"

export interface PriceInput {
  identifier_type: PriceIdentifierType
  sku?: string | undefined
  ean?: string | undefined
  variant_id?: string | undefined
  currency_code: string
  amount: number
  min_quantity?: number
}

export interface PriceListInput {
  code: string
  name: string
  description?: string
  type?: "sale" | "override"
  status?: "active" | "draft"
  starts_at?: string
  ends_at?: string
  customer_group_code?: string
  prices?: PriceInput[]
}

export interface UpdatePriceListPricesBatchInput {
  code: string
  prices: PriceInput[]
}

export interface UpsertPriceListsBatchInput {
  price_lists: PriceListInput[]
}

export interface PriceListPriceResult {
  identifier_type: PriceIdentifierType
  sku?: string | undefined
  ean?: string | undefined
  variant_id?: string | undefined
  status: "updated" | "failed" | "not_found"
  error?: string
}

export interface UpdatePriceListPricesBatchOutput {
  success: boolean
  price_list_id?: string
  prices_updated: number
  prices_failed: number
  results: PriceListPriceResult[]
}

export interface UpsertPriceListsBatchResult {
  code: string
  status: "created" | "updated" | "failed"
  price_list_id?: string
  prices_updated?: number
  error?: string
}

export interface UpsertPriceListsBatchOutput {
  success: boolean
  processed: number
  failed: number
  results: UpsertPriceListsBatchResult[]
}

export interface ListPriceListsInput {
  code?: string | undefined
  limit: number
  offset: number
}

export interface ListedPriceList {
  id: string
  code: string
  name: string
  description?: string | undefined
  starts_at?: string | null
  ends_at?: string | null
}

export interface ListPriceListsOutput {
  price_lists: ListedPriceList[]
  count: number
  offset: number
  limit: number
}
