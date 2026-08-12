import { z } from "@medusajs/framework/zod"

export const StoreHeurekaShopReviewsSchema = z
  .object({
    locale: z.enum(["cs", "sk"]).optional().default("sk"),
  })
  .strict()

export type StoreHeurekaShopReviewsSchemaType = z.infer<
  typeof StoreHeurekaShopReviewsSchema
>
