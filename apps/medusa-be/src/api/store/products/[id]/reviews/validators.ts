import { z } from "@medusajs/framework/zod"

export const StoreGetProductReviewsSchema = z
  .object({
    locale: z.enum(["sk-SK", "ro-RO", "cs-CZ", "hu-HU"]).default("sk-SK"),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict()

export type StoreGetProductReviewsSchemaType = z.infer<
  typeof StoreGetProductReviewsSchema
>
