import { z } from "@medusajs/framework/zod"

const SymmyWebhookEndpointSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean().default(true),
})

export const PostAdminSymmyWebhookConfigSchema = z.object({
  is_enabled: z.boolean().optional(),
  endpoints: z.array(SymmyWebhookEndpointSchema).optional(),
})

export type PostAdminSymmyWebhookConfigSchemaType = z.infer<
  typeof PostAdminSymmyWebhookConfigSchema
>
