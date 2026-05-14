import { z } from "@medusajs/framework/zod"

const STOCK_UPDATES_BATCH_MAX = 500

const StockUpdateSchema = z
  .object({
    identifier_type: z.enum(["sku", "ean", "variant_id", "inventory_item_id"]),
    sku: z.string().min(1).optional(),
    ean: z.string().min(1).optional(),
    variant_id: z.string().min(1).optional(),
    inventory_item_id: z.string().min(1).optional(),
    location_id: z.string().min(1).optional(),
    stocked_quantity: z.number().int().nonnegative(),
    reserved_quantity: z.number().int().nonnegative().optional(),
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
    if (
      value.identifier_type === "inventory_item_id" &&
      !value.inventory_item_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "inventory_item_id is required when identifier_type is 'inventory_item_id'",
        path: ["inventory_item_id"],
      })
    }
  })

export const UpdateStockBatchSchema = z.object({
  updates: z.array(StockUpdateSchema).min(1).max(STOCK_UPDATES_BATCH_MAX),
})

export type UpdateStockBatchSchemaType = z.infer<typeof UpdateStockBatchSchema>
export type StockUpdateInputType = z.infer<typeof StockUpdateSchema>
