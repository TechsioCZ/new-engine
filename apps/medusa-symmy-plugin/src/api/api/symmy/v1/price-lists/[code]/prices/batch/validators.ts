import { z } from "@medusajs/framework/zod"
import { PriceInputSchema } from "../../../batch-upsert/validators"

const PRICE_LIST_PRICES_BATCH_MAX = 500

export const UpdatePriceListPricesBatchSchema = z.object({
  prices: z.array(PriceInputSchema).min(1).max(PRICE_LIST_PRICES_BATCH_MAX),
})

export type UpdatePriceListPricesBatchSchemaType = z.infer<
  typeof UpdatePriceListPricesBatchSchema
>
