import { z } from "@medusajs/framework/zod"

const PRICE_LISTS_BATCH_MAX = 500
const PRICE_LIST_PRICES_MAX = 500

export const PriceInputSchema = z
  .object({
    identifier_type: z.enum(["sku", "ean", "variant_id"]),
    sku: z.string().min(1).optional(),
    ean: z.string().min(1).optional(),
    variant_id: z.string().min(1).optional(),
    currency_code: z
      .string()
      .min(3)
      .max(3)
      .transform((value) => value.toLowerCase()),
    amount: z.number().nonnegative(),
    min_quantity: z.number().int().positive().default(1),
  })
  .superRefine((value, ctx) => {
    if (value.identifier_type === "sku" && !value.sku) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sku is required when identifier_type is 'sku'",
        path: ["sku"],
      })
    }
    if (value.identifier_type === "ean" && !value.ean) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ean is required when identifier_type is 'ean'",
        path: ["ean"],
      })
    }
    if (value.identifier_type === "variant_id" && !value.variant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "variant_id is required when identifier_type is 'variant_id'",
        path: ["variant_id"],
      })
    }
  })

const PriceListInputSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["sale", "override"]).default("sale"),
  status: z.enum(["active", "draft"]).default("active"),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  customer_group_code: z.string().min(1).optional(),
  prices: z.array(PriceInputSchema).max(PRICE_LIST_PRICES_MAX).optional(),
})

export const UpsertPriceListsBatchSchema = z.object({
  price_lists: z.array(PriceListInputSchema).min(1).max(PRICE_LISTS_BATCH_MAX),
})

export type UpsertPriceListsBatchSchemaType = z.infer<
  typeof UpsertPriceListsBatchSchema
>
