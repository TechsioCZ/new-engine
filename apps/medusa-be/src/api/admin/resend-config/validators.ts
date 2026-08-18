import { z } from "@medusajs/framework/zod"

export const PostAdminResendConfigSchema = z.object({
  api_store_id: z.string().trim().min(1).nullable().optional(),
  api_url: z.string().trim().url().optional(),
  is_enabled: z.boolean().optional(),
  from_email: z.string().trim().min(3).nullable().optional(),
  webhook_secret: z.string().trim().nullable().optional(),
  request_timeout_ms: z.number().int().min(1000).max(120_000).optional(),
  template_mappings: z.record(z.string(), z.string().trim()).optional(),
  product_review_request_delay_minutes: z
    .number()
    .int()
    .min(0)
    .max(525_600)
    .optional(),
})

export type PostAdminResendConfigSchemaType = z.infer<
  typeof PostAdminResendConfigSchema
>
