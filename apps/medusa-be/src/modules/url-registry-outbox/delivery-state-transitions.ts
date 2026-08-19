import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import {
  asRecord,
  assertKnownKeys,
  normalizeErrorCode,
  normalizeOutcome,
  normalizeRetryDelay,
  normalizeTransitionIdentity,
  plusMilliseconds,
} from "./delivery-state-contracts"
import { executeClaimTransition } from "./delivery-state-rows"

export const acknowledgeEvent = async (
  manager: SqlEntityManager,
  input: unknown
) => {
  const record = asRecord(input)
  assertKnownKeys(record, new Set(["claimToken", "id", "now", "outcome"]))
  const identity = normalizeTransitionIdentity(record)
  const outcome = normalizeOutcome(record.outcome)
  const now = identity.now.toISOString()
  return await executeClaimTransition(
    manager,
    `update "url_registry_outbox_event"
     set "status" = 'delivered',
         "claim_token" = null,
         "claimed_by" = null,
         "claimed_at" = null,
         "lease_expires_at" = null,
         "last_error_code" = null,
         "delivery_outcome" = ?,
         "delivered_at" = ?::timestamptz,
         "updated_at" = ?::timestamptz
     where "id" = ?
       and "status" = 'processing'
       and "claim_token" = ?
       and "deleted_at" is null
     returning "id", "status", "attempt_count"`,
    [outcome, now, now, identity.id, identity.claimToken]
  )
}

export const retryEvent = async (manager: SqlEntityManager, input: unknown) => {
  const record = asRecord(input)
  assertKnownKeys(
    record,
    new Set(["claimToken", "errorCode", "id", "now", "retryAfterMs"])
  )
  const identity = normalizeTransitionIdentity(record)
  const availableAt = plusMilliseconds(
    identity.now,
    normalizeRetryDelay(record.retryAfterMs),
    "retryAfterMs"
  ).toISOString()
  const now = identity.now.toISOString()
  return await executeClaimTransition(
    manager,
    `update "url_registry_outbox_event"
     set "status" = 'pending',
         "available_at" = ?::timestamptz,
         "claim_token" = null,
         "claimed_by" = null,
         "claimed_at" = null,
         "lease_expires_at" = null,
         "last_error_code" = ?,
         "updated_at" = ?::timestamptz
     where "id" = ?
       and "status" = 'processing'
       and "claim_token" = ?
       and "deleted_at" is null
     returning "id", "status", "attempt_count"`,
    [
      availableAt,
      normalizeErrorCode(record.errorCode),
      now,
      identity.id,
      identity.claimToken,
    ]
  )
}

export const failEvent = async (manager: SqlEntityManager, input: unknown) => {
  const record = asRecord(input)
  assertKnownKeys(record, new Set(["claimToken", "errorCode", "id", "now"]))
  const identity = normalizeTransitionIdentity(record)
  const now = identity.now.toISOString()
  return await executeClaimTransition(
    manager,
    `update "url_registry_outbox_event"
     set "status" = 'failed',
         "claim_token" = null,
         "claimed_by" = null,
         "claimed_at" = null,
         "lease_expires_at" = null,
         "last_error_code" = ?,
         "failed_at" = ?::timestamptz,
         "updated_at" = ?::timestamptz
     where "id" = ?
       and "status" = 'processing'
       and "claim_token" = ?
       and "deleted_at" is null
     returning "id", "status", "attempt_count"`,
    [
      normalizeErrorCode(record.errorCode),
      now,
      now,
      identity.id,
      identity.claimToken,
    ]
  )
}
