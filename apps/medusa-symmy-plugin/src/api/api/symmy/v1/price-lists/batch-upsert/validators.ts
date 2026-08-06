import { z } from "@medusajs/framework/zod"

import { requireIdentifierField } from "../../refine-identifier"

const PRICE_LISTS_BATCH_MAX = 500
const PRICE_LIST_PRICES_MAX = 500

export const PriceInputSchema = z
  .object({
    amount: z.number().nonnegative(),
    currency_code: z
      .string()
      .min(3)
      .max(3)
      .transform((value) => value.toLowerCase()),
    ean: z.string().min(1).optional(),
    identifier_type: z.enum(["sku", "ean", "variant_id"]),
    min_quantity: z.number().int().positive().default(1),
    sku: z.string().min(1).optional(),
    variant_id: z.string().min(1).optional(),
  })
  .superRefine(requireIdentifierField)

const PriceListInputSchema = z.object({
  code: z.string().min(1),
  customer_group_code: z.string().min(1).optional(),
  description: z.string().optional(),
  ends_at: z.iso.datetime().optional(),
  name: z.string().min(1),
  prices: z.array(PriceInputSchema).max(PRICE_LIST_PRICES_MAX).optional(),
  starts_at: z.iso.datetime().optional(),
  status: z.enum(["active", "draft"]).default("active"),
  type: z.enum(["sale", "override"]).default("sale"),
})

export const UpsertPriceListsBatchSchema = z.object({
  price_lists: z.array(PriceListInputSchema).min(1).max(PRICE_LISTS_BATCH_MAX),
})

export type UpsertPriceListsBatchSchemaType = z.infer<
  typeof UpsertPriceListsBatchSchema
>
