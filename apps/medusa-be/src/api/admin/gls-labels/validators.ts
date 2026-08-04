import { z } from "@medusajs/framework/zod"

export const PostAdminGLSLabelsSchema = z.object({
  order_ids: z.array(z.string().min(1)).min(1).max(100),
})

export type PostAdminGLSLabelsSchemaType = z.infer<
  typeof PostAdminGLSLabelsSchema
>
