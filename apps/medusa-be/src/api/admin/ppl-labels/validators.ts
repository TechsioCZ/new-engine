import { z } from '@medusajs/framework/zod'

export const PostAdminPPLLabelsSchema = z.object({
	order_ids: z.array(z.string().min(1)).min(1).max(100)
})

export type PostAdminPPLLabelsSchemaType = z.infer<typeof PostAdminPPLLabelsSchema>
