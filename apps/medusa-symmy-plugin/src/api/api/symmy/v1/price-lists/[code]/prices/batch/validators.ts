import { z } from "@medusajs/framework/zod"
import { PriceInputSchema } from "../../../batch-upsert/validators"

export const UpdatePriceListPricesBatchSchema = z.object({
  prices: z.array(PriceInputSchema).min(1),
})

export type UpdatePriceListPricesBatchSchemaType = z.infer<
  typeof UpdatePriceListPricesBatchSchema
>
