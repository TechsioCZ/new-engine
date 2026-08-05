import { z } from "@medusajs/framework/zod"

const SymmyWebhookEndpointSchema = z.object({
  enabled: z.boolean().default(true),
  url: z.string().url(),
})

export const PostAdminSymmyWebhookConfigSchema = z.object({
  endpoints: z.array(SymmyWebhookEndpointSchema).optional(),
  is_enabled: z.boolean().optional(),
})

export type PostAdminSymmyWebhookConfigSchemaType = z.infer<
  typeof PostAdminSymmyWebhookConfigSchema
>
