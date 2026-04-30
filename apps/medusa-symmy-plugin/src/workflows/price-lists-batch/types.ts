export type PriceIdentifierType = "sku" | "ean" | "variant_id"

export type PriceInput = {
  identifier_type: PriceIdentifierType
  sku?: string
  ean?: string
  variant_id?: string
  currency_code: string
  amount: number
  min_quantity?: number
}

export type PriceListInput = {
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

export type UpdatePriceListPricesBatchInput = {
  code: string
  prices: PriceInput[]
}

export type UpsertPriceListsBatchInput = {
  price_lists: PriceListInput[]
}

export type PriceListPriceResult = {
  identifier_type: PriceIdentifierType
  sku?: string
  ean?: string
  variant_id?: string
  status: "updated" | "failed" | "not_found"
  error?: string
}

export type UpdatePriceListPricesBatchOutput = {
  success: boolean
  price_list_id?: string
  prices_updated: number
  prices_failed: number
  results: PriceListPriceResult[]
}

export type UpsertPriceListsBatchResult = {
  code: string
  status: "created" | "updated" | "failed"
  price_list_id?: string
  prices_updated?: number
  error?: string
}

export type UpsertPriceListsBatchOutput = {
  success: boolean
  processed: number
  failed: number
  results: UpsertPriceListsBatchResult[]
}

export type ListPriceListsInput = {
  code?: string
  limit: number
  offset: number
}

export type ListedPriceList = {
  id: string
  code: string
  name: string
  description?: string
  starts_at?: string | null
  ends_at?: string | null
}

export type ListPriceListsOutput = {
  price_lists: ListedPriceList[]
  count: number
  offset: number
  limit: number
}
