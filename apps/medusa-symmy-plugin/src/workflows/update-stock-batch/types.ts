export type StockIdentifierType =
  | "sku"
  | "ean"
  | "variant_id"
  | "inventory_item_id"

export type StockUpdateInput = {
  identifier_type: StockIdentifierType
  sku?: string
  ean?: string
  variant_id?: string
  inventory_item_id?: string
  location_id?: string
  stocked_quantity: number
  reserved_quantity?: number
}

export type UpdateStockBatchInput = {
  updates: StockUpdateInput[]
}

export type UpdateStockBatchResult = {
  identifier_type: StockIdentifierType
  identifier: string
  status: "updated" | "failed" | "not_found"
  inventory_item_id?: string
  stocked_quantity?: number
  available_quantity?: number
  error?: string
}

export type UpdateStockBatchOutput = {
  success: boolean
  updated: number
  failed: number
  results: UpdateStockBatchResult[]
}
