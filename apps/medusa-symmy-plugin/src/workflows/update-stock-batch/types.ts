export type StockIdentifierType =
  | "sku"
  | "ean"
  | "variant_id"
  | "inventory_item_id"

export interface StockUpdateInput {
  identifier_type: StockIdentifierType
  sku?: string | undefined
  ean?: string | undefined
  variant_id?: string | undefined
  inventory_item_id?: string | undefined
  location_id?: string | undefined
  stocked_quantity: number
  reserved_quantity?: number | undefined
}

export interface UpdateStockBatchInput {
  updates: StockUpdateInput[]
}

export interface UpdateStockBatchResult {
  identifier_type: StockIdentifierType
  identifier: string
  status: "updated" | "failed" | "not_found"
  inventory_item_id?: string
  stocked_quantity?: number
  available_quantity?: number
  error?: string
}

export interface UpdateStockBatchOutput {
  success: boolean
  updated: number
  failed: number
  results: UpdateStockBatchResult[]
}
