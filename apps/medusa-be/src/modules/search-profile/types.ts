import { z as zod } from "@medusajs/framework/zod"

const dateValueSchema = zod.union([zod.date(), zod.string()])
const salesChannelIdsSchema = zod
  .union([
    zod.array(zod.string()),
    zod.object({ values: zod.array(zod.string()) }),
  ])
  .transform((value) => (Array.isArray(value) ? value : value.values))

export const SearchProfileDTOSchema = zod.object({
  autocomplete_brand_limit: zod.number(),
  autocomplete_category_limit: zod.number(),
  autocomplete_content_limit: zod.number(),
  autocomplete_product_limit: zod.number(),
  availability: zod.enum(["all", "in-stock"]),
  created_at: dateValueSchema,
  deleted_at: dateValueSchema.nullable().optional(),
  domain: zod.string(),
  full_search_limit: zod.number(),
  id: zod.string(),
  key: zod.string(),
  last_deleted_count: zod.number(),
  last_indexed_count: zod.number(),
  last_sync_error: zod.string().nullable(),
  last_sync_mode: zod.enum(["normal", "full"]).nullable(),
  last_sync_started_at: dateValueSchema.nullable(),
  last_sync_status: zod.enum(["never", "running", "succeeded", "failed"]),
  last_synced_at: dateValueSchema.nullable(),
  locale: zod.string(),
  max_results_per_page: zod.number(),
  minimum_ranking_score: zod.number().nullable(),
  popular_limit: zod.number(),
  sales_channel_ids: salesChannelIdsSchema,
  separate_variant_results: zod.boolean(),
  shop: zod.string(),
  strict: zod.boolean(),
  updated_at: dateValueSchema,
})

export const MAX_SEARCH_PROFILES = 100

export const SearchProfileDTOArraySchema = zod
  .array(SearchProfileDTOSchema)
  .max(MAX_SEARCH_PROFILES)

export type SearchProfileDTO = zod.infer<typeof SearchProfileDTOSchema>

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
