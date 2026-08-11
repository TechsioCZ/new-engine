import { z as zod } from '@medusajs/framework/zod'

export const StoreVolumeDiscountsQuerySchema = zod
	.object({
		variant_id: zod.string().trim().min(1),
		region_id: zod.string().trim().min(1),
		sales_channel_id: zod.string().trim().min(1).optional()
	})
	.strict()

export type StoreVolumeDiscountsQuery = zod.infer<typeof StoreVolumeDiscountsQuerySchema>
