import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import { MedusaError } from "@medusajs/framework/utils"
import {
  type ClaimedUrlRegistryOutboxEvent,
  UrlRegistryOutboxClaimConflictError,
  type UrlRegistryOutboxDeliveryTransition,
} from "./delivery-state-contracts"

export type DeliveryRow = Readonly<{
  attempt_count: number | string
  change_type: "delete" | "reconcile"
  claim_token: string
  claimed_at: Date | string
  claimed_by: string
  entity_id: string
  entity_kind: string
  envelope_fingerprint: string
  event_id: string
  id: string
  lease_expires_at: Date | string
  market_code: "cz" | "hu" | "ro" | "sk"
  occurred_at: Date | string
  payload: unknown
  source: string
  status: "processing"
  stream_id: string
  stream_sequence: number | string
}>

export type CandidateRow = Readonly<{ id: string; claim_token?: string }>

export type TransitionRow = Readonly<{
  attempt_count: number | string
  id: string
  status: "delivered" | "failed" | "pending"
}>

const positiveInteger = (value: number | string, label: string) => {
  const parsed = Number(value)
  if (!(Number.isSafeInteger(parsed) && parsed > 0)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `URL registry outbox ${label} is invalid`
    )
  }
  return parsed
}

const isoTimestamp = (value: Date | string, label: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `URL registry outbox ${label} is invalid`
    )
  }
  return date.toISOString()
}

export const exactlyOne = <T extends object>(
  rows: readonly T[],
  label: string
): T => {
  const row = rows[0]
  if (rows.length !== 1 || !row) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `URL registry outbox ${label} invariant failed`
    )
  }
  return row
}

export const toClaimedEvent = (
  row: DeliveryRow
): ClaimedUrlRegistryOutboxEvent => ({
  attemptCount: positiveInteger(row.attempt_count, "attempt count"),
  changeType: row.change_type,
  claimToken: row.claim_token,
  claimedAt: isoTimestamp(row.claimed_at, "claim timestamp"),
  claimedBy: row.claimed_by,
  entityId: row.entity_id,
  entityKind: row.entity_kind,
  envelopeFingerprint: row.envelope_fingerprint,
  eventId: row.event_id,
  id: row.id,
  leaseExpiresAt: isoTimestamp(row.lease_expires_at, "lease timestamp"),
  marketCode: row.market_code,
  occurredAt: isoTimestamp(row.occurred_at, "event timestamp"),
  payload: row.payload,
  source: row.source,
  status: row.status,
  streamId: row.stream_id,
  streamSequence: positiveInteger(row.stream_sequence, "stream sequence"),
})

export const toTransition = (
  row: TransitionRow
): UrlRegistryOutboxDeliveryTransition => ({
  attemptCount: positiveInteger(row.attempt_count, "attempt count"),
  id: row.id,
  status: row.status,
})

export const executeClaimTransition = async (
  manager: SqlEntityManager,
  sql: string,
  parameters: readonly unknown[]
) => {
  const rows = await manager.execute<TransitionRow[]>(sql, [...parameters])
  if (rows.length === 0) {
    throw new UrlRegistryOutboxClaimConflictError()
  }
  return toTransition(exactlyOne(rows, "delivery transition"))
}
