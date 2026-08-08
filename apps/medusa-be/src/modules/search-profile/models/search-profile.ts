import { model } from "@medusajs/framework/utils"

const SearchProfile = model
  .define("search_profile", {
    autocomplete_brand_limit: model.number().default(3),
    autocomplete_category_limit: model.number().default(3),
    autocomplete_content_limit: model.number().default(3),
    autocomplete_product_limit: model.number().default(6),
    availability: model.text().default("all"),
    domain: model.text().searchable(),
    full_search_limit: model.number().default(500),
    id: model.id().primaryKey(),
    key: model.text().searchable(),
    last_deleted_count: model.number().default(0),
    last_indexed_count: model.number().default(0),
    last_sync_error: model.text().nullable(),
    last_sync_mode: model.text().nullable(),
    last_sync_started_at: model.dateTime().nullable(),
    last_sync_status: model.text().default("never"),
    last_synced_at: model.dateTime().nullable(),
    locale: model.text().searchable(),
    max_results_per_page: model.number().default(100),
    minimum_ranking_score: model.float().nullable(),
    popular_limit: model.number().default(12),
    sales_channel_ids: model.json(),
    separate_variant_results: model.boolean().default(false),
    shop: model.text().searchable(),
    strict: model.boolean().default(false),
  })
  .indexes([
    {
      name: "IDX_search_profile_key_unique",
      on: ["key"],
      unique: true,
      where: "deleted_at IS NULL",
    },
    {
      name: "IDX_search_profile_scope_unique",
      on: ["shop", "domain", "locale"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ])
  .checks([
    {
      expression: (columns) => `${columns.availability} in ('all', 'in-stock')`,
      name: "search_profile_availability_check",
    },
    {
      expression: (columns) =>
        `${columns.minimum_ranking_score} is null or (${columns.minimum_ranking_score} >= 0 and ${columns.minimum_ranking_score} <= 1)`,
      name: "search_profile_minimum_ranking_score_check",
    },
    {
      expression: (columns) =>
        `${columns.last_sync_status} in ('never', 'running', 'succeeded', 'failed')`,
      name: "search_profile_sync_status_check",
    },
    {
      expression: (columns) =>
        `${columns.last_sync_mode} is null or ${columns.last_sync_mode} in ('normal', 'full')`,
      name: "search_profile_sync_mode_check",
    },
  ])

export default SearchProfile
