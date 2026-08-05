/**
 * Pure utility functions for PPL fulfillment processing
 * Separated from job file to allow unit testing without triggering module loading
 */
import type { PplFulfillmentData } from "./types"

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

/** Fulfillment record shape from query */
export interface FulfillmentRecord {
  id: string
  data: PplFulfillmentData | null
  created_at: string
  provider_id: string
}

/** Narrowed type after filter - has confirmed pending status and batch_id */
export interface PendingFulfillment extends FulfillmentRecord {
  data: PplFulfillmentData & { batch_id: string }
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
export function checkTimeoutConditions(
  fulfillment: PendingFulfillment,
  attemptInfo: SyncAttemptInfo
): { reason: string; message: string } | null {
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
