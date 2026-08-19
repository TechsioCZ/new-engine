import { randomUUID } from "node:crypto"
import { asInteger, asRecord, asString, asStringArray } from "./runtime"
import type { SqlPool } from "./sql"

export type ClaimedInvalidationOutboxEvent = Readonly<{
  attemptCount: number
  claimToken: string
  id: string
  tags: readonly string[]
}>

export type InvalidationOutboxHealth = Readonly<{
  delivered: number
  failed: number
  pending: number
  processing: number
}>

type ClaimInput = Readonly<{
  batchSize: number
  now: Date
  workerId: string
}>

type DeliveryTransitionInput = Readonly<{
  claimToken: string
  id: string
  now: Date
}>

type FailureTransitionInput = DeliveryTransitionInput &
  Readonly<{ errorCode: string }>

type RetryTransitionInput = FailureTransitionInput &
  Readonly<{ retryAfterMs: number }>

const changedOneRow = (rowCount: number | null): boolean => rowCount === 1

export const createInvalidationOutboxStore = (pool: SqlPool) => ({
  claim: async ({ batchSize, now, workerId }: ClaimInput) => {
    const claimToken = `${workerId}:${randomUUID()}`
    const result = await pool.query(
      `WITH candidates AS (
         SELECT id
         FROM url_registry.url_registry_invalidation_outbox
         WHERE status = 'pending' AND available_at <= $1
         ORDER BY available_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT $2
       )
       UPDATE url_registry.url_registry_invalidation_outbox AS event
       SET status = 'processing',
           attempt_count = event.attempt_count + 1,
           locked_at = $1,
           locked_by = $3
       FROM candidates
       WHERE event.id = candidates.id
       RETURNING event.id::text AS id, event.attempt_count,
                 event.locked_by, event.invalidation_tags`,
      [now, batchSize, claimToken]
    )
    return result.rows.map((value): ClaimedInvalidationOutboxEvent => {
      const row = asRecord(value, "claimed invalidation outbox row")
      const tags = asStringArray(
        row.invalidation_tags,
        "outbox.invalidation_tags"
      )
      return {
        attemptCount: asInteger(row.attempt_count, "outbox.attempt_count"),
        claimToken: asString(row.locked_by, "outbox.locked_by"),
        id: asString(row.id, "outbox.id"),
        tags,
      }
    })
  },

  fail: async ({ claimToken, errorCode, id, now }: FailureTransitionInput) => {
    const result = await pool.query(
      `UPDATE url_registry.url_registry_invalidation_outbox
       SET status = 'failed', locked_at = NULL, locked_by = NULL,
           failed_at = $3, last_error_code = $4
       WHERE id = $1::bigint AND status = 'processing' AND locked_by = $2`,
      [id, claimToken, now, errorCode]
    )
    return changedOneRow(result.rowCount)
  },

  health: async (): Promise<InvalidationOutboxHealth> => {
    const result = await pool.query(
      `SELECT count(*) FILTER (WHERE status = 'pending')::text AS pending,
              count(*) FILTER (WHERE status = 'processing')::text AS processing,
              count(*) FILTER (WHERE status = 'delivered')::text AS delivered,
              count(*) FILTER (WHERE status = 'failed')::text AS failed
       FROM url_registry.url_registry_invalidation_outbox`
    )
    const row = asRecord(result.rows[0], "invalidation outbox health row")
    return {
      delivered: asInteger(row.delivered, "outbox.delivered"),
      failed: asInteger(row.failed, "outbox.failed"),
      pending: asInteger(row.pending, "outbox.pending"),
      processing: asInteger(row.processing, "outbox.processing"),
    }
  },

  markDelivered: async ({ claimToken, id, now }: DeliveryTransitionInput) => {
    const result = await pool.query(
      `UPDATE url_registry.url_registry_invalidation_outbox
       SET status = 'delivered', locked_at = NULL, locked_by = NULL,
           delivered_at = $3, failed_at = NULL, last_error_code = NULL
       WHERE id = $1::bigint AND status = 'processing' AND locked_by = $2`,
      [id, claimToken, now]
    )
    return changedOneRow(result.rowCount)
  },

  reclaimExpired: async (input: {
    batchSize: number
    leaseDurationMs: number
    now: Date
  }) => {
    const result = await pool.query(
      `WITH expired AS (
         SELECT id
         FROM url_registry.url_registry_invalidation_outbox
         WHERE status = 'processing'
           AND locked_at <= $1::timestamptz - ($2::integer * interval '1 millisecond')
         ORDER BY locked_at, id
         FOR UPDATE SKIP LOCKED
         LIMIT $3
       )
       UPDATE url_registry.url_registry_invalidation_outbox AS event
       SET status = 'pending', available_at = $1,
           locked_at = NULL, locked_by = NULL,
           last_error_code = 'lease-expired'
       FROM expired
       WHERE event.id = expired.id
       RETURNING event.id`,
      [input.now, input.leaseDurationMs, input.batchSize]
    )
    return result.rowCount ?? 0
  },

  retry: async ({
    claimToken,
    errorCode,
    id,
    now,
    retryAfterMs,
  }: RetryTransitionInput) => {
    const result = await pool.query(
      `UPDATE url_registry.url_registry_invalidation_outbox
       SET status = 'pending',
           available_at = $3::timestamptz + ($4::integer * interval '1 millisecond'),
           locked_at = NULL, locked_by = NULL,
           failed_at = NULL, last_error_code = $5
       WHERE id = $1::bigint AND status = 'processing' AND locked_by = $2`,
      [id, claimToken, now, retryAfterMs, errorCode]
    )
    return changedOneRow(result.rowCount)
  },
})

export type InvalidationOutboxStore = ReturnType<
  typeof createInvalidationOutboxStore
>
