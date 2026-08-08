import { z as zod } from '@medusajs/framework/zod'

const INDEX_SAFE_VALUE = /^[a-z0-9][a-z0-9_-]*$/
const indexSafeString = zod.string().trim().min(1).max(255).regex(INDEX_SAFE_VALUE, 'Use lowercase letters, numbers, underscores, and hyphens only.')

export const AdminSearchProfileInputSchema = zod
	.object({
		key: indexSafeString,
		shop: indexSafeString,
		domain: indexSafeString,
		locale: indexSafeString,
		sales_channel_ids: zod.array(zod.string().trim().min(1)).max(50),
		strict: zod.boolean(),
		separate_variant_results: zod.boolean(),
		minimum_ranking_score: zod.number().finite().min(0).max(1).nullable(),
		availability: zod.enum(['all', 'in-stock']),
		autocomplete_product_limit: zod.number().int().min(1).max(24),
		autocomplete_category_limit: zod.number().int().min(1).max(24),
		autocomplete_brand_limit: zod.number().int().min(1).max(24),
		autocomplete_content_limit: zod.number().int().min(1).max(24),
		full_search_limit: zod.number().int().min(1).max(1000),
		max_results_per_page: zod.number().int().min(1).max(100),
		popular_limit: zod.number().int().min(1).max(48)
	})
	.strict()

export const AdminSearchProfileSyncSchema = zod
	.object({
		mode: zod.enum(['normal', 'full'])
	})
	.strict()

export const AdminSearchProfileTestSchema = zod
	.object({
		query: zod.string().trim().max(250),
		type: zod.enum(['product', 'category', 'brand', 'content']),
		limit: zod.number().int().min(1).max(25).optional().default(10)
	})
	.strict()

export type AdminSearchProfileInputSchemaType = zod.infer<typeof AdminSearchProfileInputSchema>
export type AdminSearchProfileSyncSchemaType = zod.infer<typeof AdminSearchProfileSyncSchema>
export type AdminSearchProfileTestSchemaType = zod.infer<typeof AdminSearchProfileTestSchema>
