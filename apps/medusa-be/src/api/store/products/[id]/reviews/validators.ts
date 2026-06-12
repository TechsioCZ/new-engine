import { z } from "@medusajs/framework/zod"

export const StoreGetProductReviewsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict()

export type StoreGetProductReviewsSchemaType = z.infer<
  typeof StoreGetProductReviewsSchema
>
