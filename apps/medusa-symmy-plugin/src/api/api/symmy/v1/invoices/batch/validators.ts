import { z } from "@medusajs/framework/zod"

import { requireIdentifierField } from "../../refine-identifier"

const INVOICES_BATCH_MAX = 500

const InvoiceInputSchema = z
  .object({
    identifier_type: z.enum(["display_id", "order_id", "erp_id"]),
    display_id: z.string().min(1).optional(),
    order_id: z.string().min(1).optional(),
    erp_id: z.string().min(1).optional(),
    invoice_number: z.string().min(1),
    invoice_date: z.string().date().optional(),
    url: z.string().url().optional(),
    data: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    requireIdentifierField(value, ctx)

    if (!(value.url || value.data)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Either url or data must be provided",
        path: ["url"],
      })
    }
  })

export const AttachInvoicesBatchSchema = z.object({
  invoices: z.array(InvoiceInputSchema).min(1).max(INVOICES_BATCH_MAX),
})

export type AttachInvoicesBatchSchemaType = z.infer<
  typeof AttachInvoicesBatchSchema
>
