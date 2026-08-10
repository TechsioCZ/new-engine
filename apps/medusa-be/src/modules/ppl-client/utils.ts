/**
 * Pure utility functions for PPL fulfillment processing
 * Separated from job file to allow unit testing without triggering module loading
 */
import { z } from "@medusajs/framework/zod"

/**
 * Maximum number of sync attempts before marking as error
 * After 60 attempts (1 per minute), that's ~1 hour of retrying
 */
export const MAX_SYNC_ATTEMPTS = 60

/**
 * Maximum age of pending fulfillment in milliseconds before marking as error
 * 24 hours - if batch hasn't completed in 24h, something is wrong
 */
export const MAX_PENDING_AGE_MS = 24 * 60 * 60 * 1000

const pplShipmentStateSchema = z.enum([
  "Active",
  "BackToSender",
  "DataShipment",
  "Delivered",
  "DeliveredToPickupPoint",
  "Dormant",
  "NotDelivered",
  "OutForDelivery",
  "PickedUpFromSender",
  "Rejected",
  "Undelivered",
])

const pendingFulfillmentDataSchema = z.object({
  access_point_id: z.string().optional(),
  batch_id: z.string(),
  delivery_failed: z.boolean().optional(),
  error_message: z.string().optional(),
  first_sync_attempt: z.string().optional(),
  label_url: z.string().optional(),
  last_status: pplShipmentStateSchema.optional(),
  last_status_date: z.string().optional(),
  last_sync_attempt: z.string().optional(),
  ppl_label_url: z.string().optional(),
  product_type: z.string(),
  shipment_number: z.string().optional(),
  status: z.literal("pending"),
  sync_attempts: z.number().optional(),
  tracking_url: z.string().optional(),
})

/** Exact fulfillment projection decoded from the label-sync graph query. */
export const pendingFulfillmentSchema = z.object({
  created_at: z.string(),
  data: pendingFulfillmentDataSchema,
  id: z.string(),
  provider_id: z.string(),
})

export type PendingFulfillment = z.infer<typeof pendingFulfillmentSchema>

export const parsePendingFulfillment = (
  value: unknown,
): PendingFulfillment | null => {
  const result = pendingFulfillmentSchema.safeParse(value)
  return result.success ? result.data : null
}

/** Sync attempt tracking */
export interface SyncAttemptInfo {
  syncAttempts: number
  firstSyncAttempt: string
  now: string
}

/**
 * Check if fulfillment has exceeded timeout conditions
 */
export const checkTimeoutConditions = (
  fulfillment: PendingFulfillment,
  attemptInfo: SyncAttemptInfo,
): { reason: string; message: string } | null => {
  if (attemptInfo.syncAttempts >= MAX_SYNC_ATTEMPTS) {
    return {
      message: `Batch ${fulfillment.data.batch_id} never completed after ${MAX_SYNC_ATTEMPTS} attempts`,
      reason: `exceeded max sync attempts (${MAX_SYNC_ATTEMPTS})`,
    }
  }

  const createdAt = new Date(fulfillment.created_at).getTime()
  if (Date.now() - createdAt > MAX_PENDING_AGE_MS) {
    return {
      message: `Batch ${fulfillment.data.batch_id} pending for over 24 hours`,
      reason: "pending for over 24 hours",
    }
  }

  return null
}
