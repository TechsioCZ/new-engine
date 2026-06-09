import { z } from "@medusajs/framework/zod"

export const ReviewStatusSchema = z.enum(["approved", "pending", "rejected"])

export const AdminGetReviewsSchema = z
  .object({
    customer_id: z.string().trim().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    offset: z.coerce.number().int().min(0).optional().default(0),
    order: z.string().optional(),
    order_by: z.string().optional(),
    product_id: z.string().trim().optional(),
    q: z.string().trim().optional(),
    status: ReviewStatusSchema.optional(),
  })
  .strict()

export const AdminUpdateReviewStatusSchema = z
  .object({
    ids: z.array(z.string().trim().min(1)).min(1).max(100),
    status: ReviewStatusSchema,
  })
  .strict()

export type AdminGetReviewsSchemaType = z.infer<typeof AdminGetReviewsSchema>
export type AdminUpdateReviewStatusSchemaType = z.infer<
  typeof AdminUpdateReviewStatusSchema
>
