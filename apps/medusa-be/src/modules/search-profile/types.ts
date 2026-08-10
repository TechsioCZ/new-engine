export type SearchProfileDTO = {
  id: string
  key: string
  shop: string
  domain: string
  locale: string
  sales_channel_ids: string[]
  strict: boolean
  separate_variant_results: boolean
  minimum_ranking_score: number | null
  availability: "all" | "in-stock"
  autocomplete_product_limit: number
  autocomplete_category_limit: number
  autocomplete_brand_limit: number
  autocomplete_content_limit: number
  full_search_limit: number
  max_results_per_page: number
  popular_limit: number
  last_sync_status: "never" | "running" | "succeeded" | "failed"
  last_sync_mode: "normal" | "full" | null
  last_sync_started_at: Date | string | null
  last_synced_at: Date | string | null
  last_sync_error: string | null
  last_indexed_count: number
  last_deleted_count: number
  created_at: Date | string
  updated_at: Date | string
  deleted_at?: Date | string | null
}

export type SearchProfileWriteInput = Omit<
  SearchProfileDTO,
  | "id"
  | "created_at"
  | "updated_at"
  | "deleted_at"
  | "last_sync_status"
  | "last_sync_mode"
  | "last_sync_started_at"
  | "last_synced_at"
  | "last_sync_error"
  | "last_indexed_count"
  | "last_deleted_count"
>
