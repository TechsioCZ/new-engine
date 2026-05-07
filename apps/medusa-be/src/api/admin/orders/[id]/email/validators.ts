import { z } from "@medusajs/framework/zod"
import { ALLOWED_ORDER_EMAIL_TEMPLATES } from "../../../../../utils/order-email-templates"

export const PostAdminOrderEmailSchema = z.object({
  template: z.enum(ALLOWED_ORDER_EMAIL_TEMPLATES),
})

export type PostAdminOrderEmailSchemaType = z.infer<
  typeof PostAdminOrderEmailSchema
>
