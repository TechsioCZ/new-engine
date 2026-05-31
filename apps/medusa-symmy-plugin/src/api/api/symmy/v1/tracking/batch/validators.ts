import { z } from "@medusajs/framework/zod"

const TRACKING_BATCH_MAX = 500

const TrackingItemSchema = z.object({
  sku: z.string().min(1),
  quantity: z.number().int().positive(),
})

const ShipmentInputSchema = z
  .object({
    identifier_type: z.enum(["display_id", "order_id", "erp_id"]),
    display_id: z.string().min(1).optional(),
    order_id: z.string().min(1).optional(),
    erp_id: z.string().min(1).optional(),
    tracking_number: z.string().min(1),
    tracking_url: z.string().url().optional(),
    carrier: z.string().min(1).optional(),
    send_notification: z.boolean().default(true),
    items: z.array(TrackingItemSchema).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.identifier_type === "display_id" && !value.display_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "display_id is required when identifier_type is 'display_id'",
        path: ["display_id"],
      })
    }
    if (value.identifier_type === "order_id" && !value.order_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "order_id is required when identifier_type is 'order_id'",
        path: ["order_id"],
      })
    }
    if (value.identifier_type === "erp_id" && !value.erp_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "erp_id is required when identifier_type is 'erp_id'",
        path: ["erp_id"],
      })
    }
  })

export const AddTrackingBatchSchema = z.object({
  shipments: z.array(ShipmentInputSchema).min(1).max(TRACKING_BATCH_MAX),
})

export type AddTrackingBatchSchemaType = z.infer<typeof AddTrackingBatchSchema>
export type ShipmentInputType = z.infer<typeof ShipmentInputSchema>
export type TrackingItemInputType = z.infer<typeof TrackingItemSchema>
