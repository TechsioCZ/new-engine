import { z as zod } from "@medusajs/framework/zod"

const INDEX_SAFE_VALUE = /^[a-z0-9][a-z0-9_-]*$/u
const indexSafeString = zod
  .string()
  .trim()
  .min(1)
  .max(255)
  .regex(
    INDEX_SAFE_VALUE,
    "Use lowercase letters, numbers, underscores, and hyphens only.",
  )

export const AdminSearchProfileInputSchema = zod
  .object({
    autocomplete_brand_limit: zod.number().int().min(1).max(24),
    autocomplete_category_limit: zod.number().int().min(1).max(24),
    autocomplete_content_limit: zod.number().int().min(1).max(24),
    autocomplete_product_limit: zod.number().int().min(1).max(24),
    availability: zod.enum(["all", "in-stock"]),
    domain: indexSafeString,
    full_search_limit: zod.number().int().min(1).max(1000),
    key: indexSafeString,
    locale: indexSafeString,
    max_results_per_page: zod.number().int().min(1).max(100),
    minimum_ranking_score: zod.number().min(0).max(1).nullable(),
    popular_limit: zod.number().int().min(1).max(48),
    sales_channel_ids: zod.array(zod.string().trim().min(1)).max(50),
    separate_variant_results: zod.boolean(),
    shop: indexSafeString,
    strict: zod.boolean(),
  })
  .strict()

export const AdminSearchProfileSyncSchema = zod
  .object({
    mode: zod.enum(["normal", "full"]),
  })
  .strict()

export const AdminSearchProfileTestSchema = zod
  .object({
    limit: zod.number().int().min(1).max(25).optional().default(10),
    query: zod.string().trim().max(250),
    type: zod.enum(["product", "category", "brand", "content"]),
  })
  .strict()

export type AdminSearchProfileInputSchemaType = zod.infer<
  typeof AdminSearchProfileInputSchema
>
export type AdminSearchProfileSyncSchemaType = zod.infer<
  typeof AdminSearchProfileSyncSchema
>
export type AdminSearchProfileTestSchemaType = zod.infer<
  typeof AdminSearchProfileTestSchema
>
