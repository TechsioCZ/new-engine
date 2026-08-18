import { randomUUID } from "node:crypto"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import {
  type ClaimedUrlRegistryOutboxEvent,
  normalizeClaimInput,
  normalizeReclaimInput,
  type UrlRegistryOutboxDeliveryTransition,
} from "./delivery-state-contracts"
import {
  type CandidateRow,
  type DeliveryRow,
  exactlyOne,
  type TransitionRow,
  toClaimedEvent,
  toTransition,
} from "./delivery-state-rows"

export const claimEvents = async (
  manager: SqlEntityManager,
  input: unknown
): Promise<readonly ClaimedUrlRegistryOutboxEvent[]> => {
  const normalized = normalizeClaimInput(input)
  const candidates = await manager.execute<CandidateRow[]>(
    `select event."id"
     from "url_registry_outbox_event" event
     where event."status" = 'pending'
       and event."available_at" <= ?::timestamptz
       and event."deleted_at" is null
       and not exists (
         select 1
         from "url_registry_outbox_event" predecessor
         where predecessor."stream_id" = event."stream_id"
           and predecessor."stream_sequence" < event."stream_sequence"
           -- A terminal failure intentionally blocks later events in its stream.
           and predecessor."status" <> 'delivered'
           and predecessor."deleted_at" is null
       )
     order by event."available_at", event."stream_id", event."stream_sequence", event."id"
     limit ?
     for update of event skip locked`,
    [normalized.now.toISOString(), normalized.limit]
  )

  const claimed: ClaimedUrlRegistryOutboxEvent[] = []
  for (const candidate of candidates) {
    const token = randomUUID()
    const row = exactlyOne(
      await manager.execute<DeliveryRow[]>(
        `update "url_registry_outbox_event"
         set "status" = 'processing',
             "attempt_count" = "attempt_count" + 1,
             "claim_token" = ?,
             "claimed_by" = ?,
             "claimed_at" = ?::timestamptz,
             "lease_expires_at" = ?::timestamptz,
             "last_error_code" = null,
             "updated_at" = ?::timestamptz
         where "id" = ?
           and "status" = 'pending'
           and "deleted_at" is null
         returning "id", "event_id", "source", "entity_kind", "entity_id",
           "market_code", "stream_sequence", "change_type",
           "envelope_fingerprint", "payload", "occurred_at", "status",
           "attempt_count", "claim_token", "claimed_by", "claimed_at",
           "lease_expires_at", "stream_id"`,
        [
          token,
          normalized.claimedBy,
          normalized.now.toISOString(),
          normalized.leaseExpiresAt.toISOString(),
          normalized.now.toISOString(),
          candidate.id,
        ]
      ),
      "event claim"
    )
    claimed.push(toClaimedEvent(row))
  }
  return claimed
}

export const reclaimEvents = async (
  manager: SqlEntityManager,
  input: unknown
): Promise<readonly UrlRegistryOutboxDeliveryTransition[]> => {
  const normalized = normalizeReclaimInput(input)
  const now = normalized.now.toISOString()
  const candidates = await manager.execute<CandidateRow[]>(
    `select event."id", event."claim_token"
     from "url_registry_outbox_event" event
     where event."status" = 'processing'
       and event."lease_expires_at" <= ?::timestamptz
       and event."deleted_at" is null
     order by event."lease_expires_at", event."id"
     limit ?
     for update of event skip locked`,
    [now, normalized.limit]
  )

  const reclaimed: UrlRegistryOutboxDeliveryTransition[] = []
  for (const candidate of candidates) {
    const row = exactlyOne(
      await manager.execute<TransitionRow[]>(
        `update "url_registry_outbox_event"
         set "status" = 'pending',
             "available_at" = ?::timestamptz,
             "claim_token" = null,
             "claimed_by" = null,
             "claimed_at" = null,
             "lease_expires_at" = null,
             "last_error_code" = 'lease-expired',
             "updated_at" = ?::timestamptz
         where "id" = ?
           and "status" = 'processing'
           and "claim_token" = ?
           and "lease_expires_at" <= ?::timestamptz
           and "deleted_at" is null
         returning "id", "status", "attempt_count"`,
        [now, now, candidate.id, candidate.claim_token, now]
      ),
      "expired lease reclaim"
    )
    reclaimed.push(toTransition(row))
  }
  return reclaimed
}
