import { z as zod } from "@medusajs/framework/zod"

export const StoreSearchAutocompleteSchema = zod
  .object({
    country_code: zod.string().optional(),
    currency_code: zod.string().optional(),
    locale: zod.string().trim().min(2).max(20).optional(),
    profile: zod.string().trim().min(1).max(120).optional(),
    q: zod.string().trim().max(120),
    region_id: zod.string().optional(),
    sales_channel_id: zod
      .union([zod.string(), zod.array(zod.string())])
      .optional(),
  })
  .strict()

export type StoreSearchAutocompleteSchemaType = zod.infer<
  typeof StoreSearchAutocompleteSchema
>
