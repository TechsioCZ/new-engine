import { z } from "@medusajs/framework/zod"

export const StoreCreateReviewSchema = z
  .object({
    content: z.string().trim().min(1).max(5000),
    product_id: z.string().trim().min(1),
    rating: z.coerce.number().int().min(1).max(5),
    review_token: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(120),
  })
  .strict()

export type StoreCreateReviewSchemaType = z.infer<
  typeof StoreCreateReviewSchema
>
