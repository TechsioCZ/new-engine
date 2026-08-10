import { z } from "@medusajs/framework/zod"

export const CUSTOMER_REVIEW_MAX_OFFSET = 10_000

export const StoreGetCustomerReviewsSchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce
      .number()
      .int()
      .min(0)
      .max(CUSTOMER_REVIEW_MAX_OFFSET)
      .optional()
      .default(0),
  })
  .strict()

export const StoreUpdateCustomerReviewSchema = z
  .object({
    content: z.string().trim().min(1).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    title: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided",
  })

export type StoreGetCustomerReviewsSchemaType = z.infer<
  typeof StoreGetCustomerReviewsSchema
>
export type StoreUpdateCustomerReviewSchemaType = z.infer<
  typeof StoreUpdateCustomerReviewSchema
> & {
  status?: "pending"
}
