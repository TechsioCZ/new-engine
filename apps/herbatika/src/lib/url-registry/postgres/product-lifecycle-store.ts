import type { EntityRouteSnapshot, SourceReadResult } from "../contracts"
import { UrlRegistryError } from "../errors"
import type { ProductLifecycleReceiptAction } from "../product-lifecycle"
import type {
  ProductLifecycleChangeType,
  ProductLifecycleDeliveryV1,
} from "../product-lifecycle-parser"
import type {
  ProductLifecycleReceipt,
  ProductLifecycleStreamState,
} from "./product-lifecycle-consumer-support"
import { parseRouteValue } from "./row-codec"
import {
  asInteger,
  asNullableString,
  asRecord,
  asString,
  isInvariantError,
  oneOf,
} from "./runtime"
import { loadSnapshot } from "./snapshot-store"
import type { SqlExecutor } from "./sql"
import { acquireEntityIdentityLock } from "./write-context"

const ACTIONS = [
  "retired",
  "noop-source-present",
  "noop-source-missing",
  "noop-route-missing",
  "noop-route-terminal",
  "requires-publication",
] as const satisfies readonly ProductLifecycleReceiptAction[]
const CHANGE_TYPES = [
  "delete",
  "reconcile",
] as const satisfies readonly ProductLifecycleChangeType[]
const SHA256 = /^sha256:[0-9a-f]{64}$/

type LocatedReceipt = ProductLifecycleReceipt &
  Readonly<{ sourceId: string; sourceType: string }>

const parseReceipt = (value: unknown): LocatedReceipt => {
  const row = asRecord(value, "product lifecycle receipt")
  const envelopeFingerprint = asString(
    row.envelope_fingerprint,
    "receipt.envelope_fingerprint"
  )
  if (!SHA256.test(envelopeFingerprint)) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Product lifecycle receipt has an invalid fingerprint"
    )
  }
  return {
    sourceId: asString(row.source_id, "receipt.source_id"),
    sourceType: asString(row.source_type, "receipt.source_type"),
    streamSequence: asInteger(row.stream_sequence, "receipt.stream_sequence"),
    sourceEventId: asString(row.source_event_id, "receipt.source_event_id"),
    envelopeFingerprint: envelopeFingerprint as `sha256:${string}`,
    changeType: oneOf(row.change_type, CHANGE_TYPES, "receipt.change_type"),
    action: oneOf(row.action, ACTIONS, "receipt.action"),
    commandIdempotencyKey: asNullableString(
      row.command_idempotency_key,
      "receipt.command_idempotency_key"
    ),
  }
}

export const readProductLifecycleStreamState = async (
  executor: SqlExecutor,
  delivery: ProductLifecycleDeliveryV1,
  lock: boolean
): Promise<ProductLifecycleStreamState> => {
  if (lock) {
    await acquireEntityIdentityLock(executor, {
      market: delivery.marketCode,
      sourceSystem: delivery.source,
      sourceType: delivery.entityKind,
      sourceId: delivery.entityId,
    })
  }
  const [receiptResult, cursorResult] = await Promise.all([
    executor.query(
      `SELECT source_type, source_id, stream_sequence, source_event_id,
              envelope_fingerprint, change_type, action,
              command_idempotency_key
         FROM url_registry.url_registry_source_event_receipt
        WHERE (
          source_system = 'medusa' AND source_type = 'product'
          AND source_id = $1 AND market = $2 AND stream_sequence = $3
        ) OR (
          source_system = 'medusa' AND source_event_id = $4 AND market = $2
        )
        ORDER BY source_type, source_id, stream_sequence`,
      [
        delivery.entityId,
        delivery.marketCode,
        delivery.streamSequence,
        delivery.outboxEventId,
      ]
    ),
    executor.query(
      `SELECT last_sequence
         FROM url_registry.url_registry_source_event_cursor
        WHERE source_system = 'medusa' AND source_type = 'product'
          AND source_id = $1 AND market = $2
        ${lock ? "FOR UPDATE" : ""}`,
      [delivery.entityId, delivery.marketCode]
    ),
  ])
  if (cursorResult.rows.length > 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Product lifecycle stream has more than one cursor"
    )
  }
  const receipts = receiptResult.rows.map(parseReceipt)
  return {
    cursorLastSequence:
      cursorResult.rows.length === 0
        ? null
        : asInteger(
            asRecord(cursorResult.rows[0], "product lifecycle cursor")
              .last_sequence,
            "cursor.last_sequence"
          ),
    sequenceReceipt:
      receipts.find(
        (receipt) =>
          receipt.sourceType === "product" &&
          receipt.sourceId === delivery.entityId &&
          receipt.streamSequence === delivery.streamSequence
      ) ?? null,
    eventReceipt:
      receipts.find(
        (receipt) => receipt.sourceEventId === delivery.outboxEventId
      ) ?? null,
  }
}

export const readProductLifecycleRoute = async (
  executor: SqlExecutor,
  delivery: ProductLifecycleDeliveryV1
): Promise<SourceReadResult<EntityRouteSnapshot>> => {
  try {
    const result = await executor.query(
      `SELECT to_jsonb(route) AS route
         FROM url_registry.url_route AS route
        WHERE route.market = $1 AND route.target_type = 'entity'
          AND route.source_system = 'medusa' AND route.source_type = 'product'
          AND route.source_id = $2
        LIMIT 1
        FOR UPDATE`,
      [delivery.marketCode, delivery.entityId]
    )
    if (result.rows.length === 0) {
      return { kind: "missing" }
    }
    const route = parseRouteValue(
      asRecord(result.rows[0], "product lifecycle route row").route
    )
    if (route.targetType !== "entity") {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        "Product lifecycle identity resolved to a static route"
      )
    }
    const snapshot = await loadSnapshot(executor, route)
    if (snapshot.projectionType !== "entity") {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        "Product lifecycle identity resolved to a static snapshot"
      )
    }
    return { kind: "found", value: snapshot }
  } catch (error) {
    if (isInvariantError(error)) {
      return {
        kind: "invalid-response",
        causeCode: "INVALID_DATABASE_RESPONSE",
      }
    }
    throw error
  }
}

export const appendProductLifecycleReceipt = async (
  executor: SqlExecutor,
  input: Readonly<{
    delivery: ProductLifecycleDeliveryV1
    fingerprint: `sha256:${string}`
    action: ProductLifecycleReceiptAction
    commandIdempotencyKey: string | null
  }>
) => {
  const { action, commandIdempotencyKey, delivery, fingerprint } = input
  const inserted = await executor.query(
    `INSERT INTO url_registry.url_registry_source_event_receipt (
       source_system, source_type, source_id, market, stream_sequence,
       source_event_id, envelope_fingerprint, change_type, action,
       command_idempotency_key
     ) VALUES ('medusa', 'product', $1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING source_event_id`,
    [
      delivery.entityId,
      delivery.marketCode,
      delivery.streamSequence,
      delivery.outboxEventId,
      fingerprint,
      delivery.changeType,
      action,
      commandIdempotencyKey,
    ]
  )
  const advanced = await executor.query(
    delivery.streamSequence === 1
      ? `INSERT INTO url_registry.url_registry_source_event_cursor (
           source_system, source_type, source_id, market, last_sequence
         ) VALUES ('medusa', 'product', $1, $2, 1)
         RETURNING last_sequence`
      : `UPDATE url_registry.url_registry_source_event_cursor
           SET last_sequence = $3
         WHERE source_system = 'medusa' AND source_type = 'product'
           AND source_id = $1 AND market = $2 AND last_sequence = $3 - 1
         RETURNING last_sequence`,
    delivery.streamSequence === 1
      ? [delivery.entityId, delivery.marketCode]
      : [delivery.entityId, delivery.marketCode, delivery.streamSequence]
  )
  if (inserted.rows.length !== 1 || advanced.rows.length !== 1) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Product lifecycle receipt and cursor did not advance together"
    )
  }
}
