import { createHash } from "node:crypto"
import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import { generateEntityId, MedusaError } from "@medusajs/framework/utils"
import type {
  NormalizedCatalogLifecycleEvent,
  NormalizedProductLifecycleEvent,
  NormalizedUrlRegistryLifecycleEvent,
  UrlRegistryOutboxMarket,
} from "./types"

export type UrlRegistryOutboxFingerprint = `sha256:${string}`

export type EnqueuedProductLifecycleEvent = Readonly<{
  id: string
  marketCode: UrlRegistryOutboxMarket
  replayed: boolean
  streamId: string
  streamSequence: number
}>

export type EnqueueProductLifecycleEventResult = Readonly<{
  eventId: string
  events: readonly EnqueuedProductLifecycleEvent[]
  fingerprint: UrlRegistryOutboxFingerprint
}>

type StreamRow = Readonly<{
  id: string
  last_sequence: number | string
}>

type EventRow = Readonly<{
  entity_id: string
  envelope_fingerprint: string
  id: string
  stream_id: string
  stream_sequence: number | string
}>

export class UrlRegistryOutboxConflictError extends MedusaError {
  constructor() {
    super(
      MedusaError.Types.CONFLICT,
      "URL registry outbox event ID is already bound to a different envelope"
    )
    this.name = "UrlRegistryOutboxConflictError"
  }
}

export const fingerprintProductLifecycleEvent = (
  event: NormalizedProductLifecycleEvent
): UrlRegistryOutboxFingerprint => {
  const canonicalEnvelope = JSON.stringify({
    affectedMarketCodes: event.affectedMarketCodes,
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    payloadByMarket: event.payloadByMarket,
    productId: event.productId,
    source: event.source,
  })
  return `sha256:${createHash("sha256").update(canonicalEnvelope).digest("hex")}`
}

export const fingerprintCatalogLifecycleEvent = (
  event: NormalizedCatalogLifecycleEvent
): UrlRegistryOutboxFingerprint => {
  const canonicalEnvelope = JSON.stringify({
    affectedMarketCodes: event.affectedMarketCodes,
    entityId: event.entityId,
    entityKind: event.entityKind,
    eventId: event.eventId,
    occurredAt: event.occurredAt,
    payloadByMarket: event.payloadByMarket,
    source: event.source,
  })
  return `sha256:${createHash("sha256").update(canonicalEnvelope).digest("hex")}`
}

const exactlyOne = <T extends object>(rows: readonly T[], label: string): T => {
  const row = rows[0]
  if (rows.length !== 1 || !row) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `URL registry outbox ${label} invariant failed`
    )
  }
  return row
}

const sequence = (value: number | string) => {
  const parsed = Number(value)
  if (!(Number.isSafeInteger(parsed) && parsed > 0)) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "URL registry outbox sequence is invalid"
    )
  }
  return parsed
}

const toResult = (
  row: EventRow,
  marketCode: UrlRegistryOutboxMarket,
  replayed: boolean
): EnqueuedProductLifecycleEvent => ({
  id: row.id,
  marketCode,
  replayed,
  streamId: row.stream_id,
  streamSequence: sequence(row.stream_sequence),
})

const assertReplay = (
  row: EventRow,
  event: NormalizedUrlRegistryLifecycleEvent,
  fingerprint: UrlRegistryOutboxFingerprint,
  streamId: string
) => {
  if (
    row.entity_id !== event.entityId ||
    row.envelope_fingerprint !== fingerprint ||
    row.stream_id !== streamId
  ) {
    throw new UrlRegistryOutboxConflictError()
  }
}

const enqueueMarket = async (
  manager: SqlEntityManager,
  event: NormalizedUrlRegistryLifecycleEvent,
  fingerprint: UrlRegistryOutboxFingerprint,
  marketCode: UrlRegistryOutboxMarket
): Promise<EnqueuedProductLifecycleEvent> => {
  const payload = event.payloadByMarket[marketCode]
  if (!payload) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "URL registry outbox market payload is missing"
    )
  }
  await manager.execute(
    `insert into "url_registry_outbox_stream" (
      "id", "source", "entity_kind", "entity_id", "market_code", "last_sequence"
    ) values (?, ?, ?, ?, ?, 0)
    on conflict ("source", "entity_kind", "entity_id", "market_code")
      where "deleted_at" is null
    do nothing`,
    [
      generateEntityId(undefined, "urlros"),
      event.source,
      event.entityKind,
      event.entityId,
      marketCode,
    ]
  )

  const stream = exactlyOne(
    await manager.execute<StreamRow[]>(
      `select "id", "last_sequence"
       from "url_registry_outbox_stream"
       where "source" = ?
         and "entity_kind" = ?
         and "entity_id" = ?
         and "market_code" = ?
         and "deleted_at" is null
       for update`,
      [event.source, event.entityKind, event.entityId, marketCode]
    ),
    "stream"
  )

  const existing = await manager.execute<EventRow[]>(
    `select "id", "stream_id", "stream_sequence", "entity_id", "envelope_fingerprint"
     from "url_registry_outbox_event"
     where "source" = ?
       and "event_id" = ?
       and "market_code" = ?
       and "deleted_at" is null`,
    [event.source, event.eventId, marketCode]
  )
  if (existing.length) {
    const replay = exactlyOne(existing, "event replay")
    assertReplay(replay, event, fingerprint, stream.id)
    return toResult(replay, marketCode, true)
  }

  const updatedStream = exactlyOne(
    await manager.execute<StreamRow[]>(
      `update "url_registry_outbox_stream"
       set "last_sequence" = "last_sequence" + 1,
           "updated_at" = now()
       where "id" = ?
       returning "id", "last_sequence"`,
      [stream.id]
    ),
    "sequence allocation"
  )
  const streamSequence = sequence(updatedStream.last_sequence)

  const inserted = await manager.execute<EventRow[]>(
    `insert into "url_registry_outbox_event" (
      "id", "event_id", "source", "entity_kind", "entity_id", "market_code",
      "stream_sequence", "change_type", "envelope_fingerprint", "payload",
      "occurred_at", "available_at", "stream_id"
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?::timestamptz, now(), ?)
    on conflict ("source", "event_id", "market_code")
      where "deleted_at" is null
    do nothing
    returning "id", "stream_id", "stream_sequence", "entity_id", "envelope_fingerprint"`,
    [
      generateEntityId(undefined, "urlroe"),
      event.eventId,
      event.source,
      event.entityKind,
      event.entityId,
      marketCode,
      streamSequence,
      payload.changeType,
      fingerprint,
      JSON.stringify(payload),
      event.occurredAt,
      stream.id,
    ]
  )
  if (inserted.length) {
    return toResult(exactlyOne(inserted, "event insert"), marketCode, false)
  }

  const racedReplay = exactlyOne(
    await manager.execute<EventRow[]>(
      `select "id", "stream_id", "stream_sequence", "entity_id", "envelope_fingerprint"
       from "url_registry_outbox_event"
       where "source" = ?
         and "event_id" = ?
         and "market_code" = ?
         and "deleted_at" is null`,
      [event.source, event.eventId, marketCode]
    ),
    "event replay"
  )
  assertReplay(racedReplay, event, fingerprint, stream.id)
  return toResult(racedReplay, marketCode, true)
}

export const enqueueNormalizedProductLifecycleEvent = async (
  manager: SqlEntityManager,
  event: NormalizedProductLifecycleEvent,
  fingerprint = fingerprintProductLifecycleEvent(event)
): Promise<EnqueueProductLifecycleEventResult> => {
  const events: EnqueuedProductLifecycleEvent[] = []
  for (const marketCode of event.affectedMarketCodes) {
    events.push(await enqueueMarket(manager, event, fingerprint, marketCode))
  }
  return { eventId: event.eventId, events, fingerprint }
}

export const enqueueNormalizedCatalogLifecycleEvent = async (
  manager: SqlEntityManager,
  event: NormalizedCatalogLifecycleEvent,
  fingerprint = fingerprintCatalogLifecycleEvent(event)
): Promise<EnqueueProductLifecycleEventResult> => {
  const events: EnqueuedProductLifecycleEvent[] = []
  for (const marketCode of event.affectedMarketCodes) {
    events.push(await enqueueMarket(manager, event, fingerprint, marketCode))
  }
  return { eventId: event.eventId, events, fingerprint }
}
