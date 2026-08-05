import { z } from "@medusajs/framework/zod"

import { requireIdentifierField } from "../../refine-identifier"

const TRACKING_BATCH_MAX = 500

const TrackingItemSchema = z.object({
  quantity: z.number().int().positive(),
  sku: z.string().min(1),
})

const ShipmentInputSchema = z
  .object({
    carrier: z.string().min(1).optional(),
    display_id: z.string().min(1).optional(),
    erp_id: z.string().min(1).optional(),
    identifier_type: z.enum(["display_id", "order_id", "erp_id"]),
    items: z.array(TrackingItemSchema).optional(),
    order_id: z.string().min(1).optional(),
    send_notification: z.boolean().default(true),
    tracking_number: z.string().min(1),
    tracking_url: z.string().url().optional(),
  })
  .superRefine(requireIdentifierField)

export const AddTrackingBatchSchema = z.object({
  shipments: z.array(ShipmentInputSchema).min(1).max(TRACKING_BATCH_MAX),
})

export type AddTrackingBatchSchemaType = z.infer<typeof AddTrackingBatchSchema>
export type ShipmentInputType = z.infer<typeof ShipmentInputSchema>
export type TrackingItemInputType = z.infer<typeof TrackingItemSchema>
