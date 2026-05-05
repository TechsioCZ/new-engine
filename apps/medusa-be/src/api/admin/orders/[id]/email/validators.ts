import { z } from "@medusajs/framework/zod"

export const PostAdminOrderEmailSchema = z.object({
  template: z.string().min(1),
})

export type PostAdminOrderEmailSchemaType = z.infer<
  typeof PostAdminOrderEmailSchema
>
