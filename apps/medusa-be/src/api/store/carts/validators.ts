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
        variant_id: z.string(),
        quantity: z.number(),
      })
    ),
  })
  .strict()

export type StoreSetCartCustomerNoteType = z.infer<
  typeof StoreSetCartCustomerNote
>
export const StoreSetCartCustomerNote = z
  .object({
    note: z.string(),
  })
  .strict()
