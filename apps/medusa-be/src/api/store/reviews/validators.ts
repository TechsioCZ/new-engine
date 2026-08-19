import { z } from "@medusajs/framework/zod"

const ReviewAuthorNameSchema = z.string().trim().min(1).max(120)
const OptionalReviewAuthorNameSchema = z.string().trim().max(120).optional()

export const StoreCreateReviewSchema = z
  .object({
    content: z.string().trim().min(1).max(5000),
    first_name: ReviewAuthorNameSchema.optional(),
    last_name: OptionalReviewAuthorNameSchema,
    name: ReviewAuthorNameSchema.optional(),
    product_id: z.string().trim().min(1),
    rating: z.coerce.number().int().min(1).max(5),
    review_token: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .strict()

export type StoreCreateReviewSchemaType = z.infer<
  typeof StoreCreateReviewSchema
>

export const StoreCreateReviewQuerySchema = z
  .object({
    sales_channel_id: z.string().trim().min(1),
  })
  .strict()

export type StoreCreateReviewQuerySchemaType = z.infer<
  typeof StoreCreateReviewQuerySchema
>
