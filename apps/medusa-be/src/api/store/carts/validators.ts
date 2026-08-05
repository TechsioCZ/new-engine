import { z } from "@medusajs/framework/zod"
import { createSelectParams } from "@medusajs/medusa/api/utils/validators"

export type GetCartLineItemsBulkParamsType = z.infer<
  typeof GetCartLineItemsBulkParams
>
export const GetCartLineItemsBulkParams = createSelectParams()

export type StoreAddLineItemsBulkType = z.infer<typeof StoreAddLineItemsBulk>
export const StoreAddLineItemsBulk = z
  .object({
    line_items: z.array(
      z.object({
        quantity: z.number(),
        variant_id: z.string(),
      }),
    ),
  })
  .strict()

export type StoreSetCartCustomerNoteType = z.infer<
  typeof StoreSetCartCustomerNote
>
export const StoreSetCartCustomerNote = z
  .object({
    note: z.string().trim().min(1).max(1000),
  })
  .strict()
