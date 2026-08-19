import { z as zod } from "@medusajs/framework/zod"

export const StoreSearchAutocompleteSchema = zod
  .object({
    q: zod.string().trim().max(120),
    profile: zod.string().trim().min(1).max(120).optional(),
    locale: zod.string().trim().min(2).max(20),
    region_id: zod.string().trim().min(1),
    currency_code: zod.string().trim().length(3),
    country_code: zod.string().trim().length(2),
    sales_channel_id: zod.string().trim().min(1),
  })
  .strict()

export type StoreSearchAutocompleteSchemaType = zod.infer<
  typeof StoreSearchAutocompleteSchema
>
