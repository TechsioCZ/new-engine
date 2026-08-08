import { z as zod } from '@medusajs/framework/zod'

export const StoreSearchAutocompleteSchema = zod
	.object({
		q: zod.string().trim().max(120),
		profile: zod.string().trim().min(1).max(120).optional(),
		locale: zod.string().trim().min(2).max(20).optional(),
		region_id: zod.string().optional(),
		currency_code: zod.string().optional(),
		country_code: zod.string().optional(),
		sales_channel_id: zod.union([zod.string(), zod.array(zod.string())]).optional()
	})
	.strict()

export type StoreSearchAutocompleteSchemaType = zod.infer<typeof StoreSearchAutocompleteSchema>
