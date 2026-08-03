import { z } from "@medusajs/framework/zod"

import { requireIdentifierField } from "../../refine-identifier"

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
  .superRefine(requireIdentifierField)

export const AddTrackingBatchSchema = z.object({
  shipments: z.array(ShipmentInputSchema).min(1).max(TRACKING_BATCH_MAX),
})

export type AddTrackingBatchSchemaType = z.infer<typeof AddTrackingBatchSchema>
export type ShipmentInputType = z.infer<typeof ShipmentInputSchema>
export type TrackingItemInputType = z.infer<typeof TrackingItemSchema>
