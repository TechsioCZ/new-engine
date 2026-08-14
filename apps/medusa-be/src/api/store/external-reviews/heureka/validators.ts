import { z } from "@medusajs/framework/zod"

export const StoreGetHeurekaExternalReviewsSchema = z
  .object({
    kind: z.enum(["shop", "product"]).optional().default("shop"),
    limit: z.coerce.number().int().min(1).max(20).optional().default(4),
  })
  .strict()

export type StoreGetHeurekaExternalReviewsSchemaType = z.infer<
  typeof StoreGetHeurekaExternalReviewsSchema
>
