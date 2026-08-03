import { z } from "@medusajs/framework/zod"

export const PostAdminGLSLabelsSchema = z.object({
  order_ids: z.array(z.string().min(1)).min(1).max(100),
  label_format: z.enum(["A6", "A7"]).optional(),
  label_offset: z.number().int().min(0).max(3).optional(),
})

export type PostAdminGLSLabelsSchemaType = z.infer<
  typeof PostAdminGLSLabelsSchema
>
