/**
 * Pure utility functions for PPL fulfillment processing
 * Separated from job file to allow unit testing without triggering module loading
 */
import type {
  PplConfigReference,
  PplEnvironment,
  PplFulfillmentData,
} from "./types"

export function getPplConfigReference(
  data: Record<string, unknown> | null | undefined
): PplConfigReference | undefined {
  const configId = data?.config_id
  const environment = data?.environment

  const reference: PplConfigReference = {
    ...(typeof configId === "string" && configId.trim().length > 0
      ? { config_id: configId }
      : {}),
    ...(isPplEnvironment(environment) ? { environment } : {}),
  }

  return Object.keys(reference).length > 0 ? reference : undefined
}

function isPplEnvironment(value: unknown): value is PplEnvironment {
  return value === "testing" || value === "production"
}

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
export type FulfillmentRecord = {
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
export type SyncAttemptInfo = {
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
      reason: `exceeded max sync attempts (${MAX_SYNC_ATTEMPTS})`,
      message: `Batch ${fulfillment.data.batch_id} never completed after ${MAX_SYNC_ATTEMPTS} attempts`,
    }
  }

  const createdAt = new Date(fulfillment.created_at).getTime()
  if (Date.now() - createdAt > MAX_PENDING_AGE_MS) {
    return {
      reason: "pending for over 24 hours",
      message: `Batch ${fulfillment.data.batch_id} pending for over 24 hours`,
    }
  }

  return null
}
