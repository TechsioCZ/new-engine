import { z } from "@medusajs/framework/zod"

import { requireIdentifierField } from "../../../refine-identifier"

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
  .superRefine(requireIdentifierField)

export const UpdateStockBatchSchema = z.object({
  updates: z.array(StockUpdateSchema).min(1).max(STOCK_UPDATES_BATCH_MAX),
})

export type UpdateStockBatchSchemaType = z.infer<typeof UpdateStockBatchSchema>
export type StockUpdateInputType = z.infer<typeof StockUpdateSchema>
