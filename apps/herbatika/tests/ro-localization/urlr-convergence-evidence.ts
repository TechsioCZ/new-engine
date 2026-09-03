import type {
  OutboxEventRow,
  OutboxStreamRow,
  UrlrActiveRouteRow,
  UrlrCursorRow,
  UrlrReceiptRow,
} from "./urlr-convergence-db"
import {
  type ExpectedUrlrEntity,
  RO_CATALOG_IMPORTER_SOURCE,
  RO_MARKET_CODE,
  sha256OfCanonicalValue,
  sha256OfSortedKeys,
  type UrlrEntityKind,
  urlrEntityKey,
} from "./urlr-convergence-identity"

const KNOWN_KINDS: readonly UrlrEntityKind[] = ["brand", "category", "product"]
const COMMAND_ACTIONS = new Set(["published", "retired", "slug-changed"])
const OPTIONAL_COMMAND_ACTION = "unpublished"

export type UrlrMismatchClass =
  | "blocked"
  | "cursor"
  | "extra"
  | "failed"
  | "missing"
  | "pending"
  | "processing"
  | "receipt"
  | "route"

export class UrlrConvergenceMismatchError extends Error {
  readonly mismatchClass: UrlrMismatchClass

  constructor(mismatchClass: UrlrMismatchClass, message: string) {
    super(`urlr-convergence[${mismatchClass}]: ${message}`)
    this.name = "UrlrConvergenceMismatchError"
    this.mismatchClass = mismatchClass
  }
}

export type UrlrConvergenceRows = Readonly<{
  activeRoutes: readonly UrlrActiveRouteRow[]
  cursors: readonly UrlrCursorRow[]
  events: readonly OutboxEventRow[]
  receipts: readonly UrlrReceiptRow[]
  streams: readonly OutboxStreamRow[]
}>

export type UrlrConvergenceEvidenceInput = Readonly<{
  binding: Readonly<{
    catalogScopeSha256: string
    releaseId: string
    staticTaxonomyConvergenceSha256: string
  }>
  expected: readonly ExpectedUrlrEntity[]
  generatedAt: string
  now: Date
  rows: UrlrConvergenceRows
}>

const asKind = (value: string): UrlrEntityKind | null =>
  KNOWN_KINDS.includes(value as UrlrEntityKind)
    ? (value as UrlrEntityKind)
    : null

const bump = (map: Record<string, number>, key: string) => {
  map[key] = (map[key] ?? 0) + 1
}

const expectedKeyOf = (
  entityKind: string,
  entityId: string,
  market: string
): string | null => {
  const kind = asKind(entityKind)
  return kind && market === RO_MARKET_CODE
    ? urlrEntityKey(kind, entityId)
    : null
}

const terminalEvent = (
  events: readonly OutboxEventRow[],
  sequence: number,
  key: string
): OutboxEventRow => {
  const event = events.find(
    (candidate) => candidate.streamSequence === sequence
  )
  if (!event) {
    throw new UrlrConvergenceMismatchError(
      "missing",
      `stream ${key} has no terminal outbox event at sequence ${sequence}`
    )
  }
  return event
}

/**
 * Computes gate-shaped evidence from an independently manifest-bound entity
 * set and fresh read-only rows. Historical stream predecessors are retained
 * and must all be delivered and receipted. Only the terminal event must carry
 * the manifest's current sourceVersion.
 */
export const computeUrlrConvergenceEvidence = (
  input: UrlrConvergenceEvidenceInput
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: evidence generation deliberately audits every cross-database invariant in one fail-closed boundary.
) => {
  const { binding, expected, generatedAt, now, rows } = input
  const expectedByKey = new Map(
    expected.map((entity) => [entity.entityKey, entity])
  )
  if (expectedByKey.size !== expected.length) {
    throw new UrlrConvergenceMismatchError(
      "missing",
      "expected entity set contains duplicate keys"
    )
  }
  const expectedKeys = [...expectedByKey.keys()].sort((left, right) =>
    left.localeCompare(right, "en")
  )

  const streamsByKey = new Map<string, OutboxStreamRow>()
  for (const stream of rows.streams) {
    const key = expectedKeyOf(
      stream.entityKind,
      stream.entityId,
      stream.marketCode
    )
    if (
      !(key && expectedByKey.has(key)) ||
      stream.source !== RO_CATALOG_IMPORTER_SOURCE
    ) {
      continue
    }
    if (streamsByKey.has(key)) {
      throw new UrlrConvergenceMismatchError(
        "extra",
        `entity ${key} has more than one Medusa RO outbox stream`
      )
    }
    if (!Number.isSafeInteger(stream.lastSequence) || stream.lastSequence < 1) {
      throw new UrlrConvergenceMismatchError(
        "missing",
        `stream ${key} has no positive terminal sequence`
      )
    }
    streamsByKey.set(key, stream)
  }
  const missingStreams = expectedKeys.filter((key) => !streamsByKey.has(key))
  if (missingStreams.length > 0) {
    throw new UrlrConvergenceMismatchError(
      "missing",
      `${missingStreams.length} expected outbox stream(s) were not found: ${missingStreams.slice(0, 5).join(", ")}`
    )
  }

  const streamIdToKey = new Map(
    [...streamsByKey.entries()].map(([key, stream]) => [stream.id, key])
  )
  const eventsByKey = new Map<string, OutboxEventRow[]>()
  for (const event of rows.events) {
    const key = streamIdToKey.get(event.streamId)
    if (!key) {
      continue
    }
    const bucket = eventsByKey.get(key) ?? []
    bucket.push(event)
    eventsByKey.set(key, bucket)
  }

  const statusCounts = { delivered: 0, failed: 0, pending: 0, processing: 0 }
  const deliveryOutcomeCounts = {
    alreadyApplied: 0,
    applied: 0,
    noopStale: 0,
  }
  const lastErrorCodeCounts: Record<string, number> = {}
  const deliveredBusinessEventIds: string[] = []
  const eventsByReceiptKey = new Map<string, OutboxEventRow>()
  let pendingReadyCount = 0
  let pendingFutureCount = 0
  let processingCount = 0
  let processingExpiredCount = 0
  let blockedStreamCount = 0

  for (const key of expectedKeys) {
    const stream = streamsByKey.get(key) as OutboxStreamRow
    const events = [...(eventsByKey.get(key) ?? [])].sort(
      (left, right) => left.streamSequence - right.streamSequence
    )
    if (events.length !== stream.lastSequence) {
      throw new UrlrConvergenceMismatchError(
        "missing",
        `stream ${key} has ${events.length} event row(s) through terminal sequence ${stream.lastSequence}`
      )
    }
    const seenIds = new Set<string>()
    let streamBlocked = false
    for (let index = 0; index < events.length; index += 1) {
      const event = events[index] as OutboxEventRow
      const expectedSequence = index + 1
      if (
        event.streamSequence !== expectedSequence ||
        seenIds.has(event.id) ||
        !event.id ||
        !event.eventId ||
        !event.sourceVersion
      ) {
        throw new UrlrConvergenceMismatchError(
          "extra",
          `stream ${key} has an invalid or non-contiguous event history`
        )
      }
      seenIds.add(event.id)
      statusCounts[event.status] += 1
      const receiptKey = `${key}\0${event.streamSequence}`
      eventsByReceiptKey.set(receiptKey, event)

      if (event.status === "pending") {
        streamBlocked = true
        if (new Date(event.availableAt).valueOf() <= now.valueOf()) {
          pendingReadyCount += 1
        } else {
          pendingFutureCount += 1
        }
      } else if (event.status === "processing") {
        streamBlocked = true
        if (
          event.leaseExpiresAt &&
          new Date(event.leaseExpiresAt).valueOf() < now.valueOf()
        ) {
          processingExpiredCount += 1
        } else {
          processingCount += 1
        }
      } else if (event.status === "failed") {
        streamBlocked = true
        bump(lastErrorCodeCounts, event.lastErrorCode ?? "unknown")
      } else {
        if (event.deliveryOutcome === "applied") {
          deliveryOutcomeCounts.applied += 1
        } else if (event.deliveryOutcome === "already-applied") {
          deliveryOutcomeCounts.alreadyApplied += 1
        } else if (event.deliveryOutcome === "noop-stale") {
          deliveryOutcomeCounts.noopStale += 1
        } else {
          throw new UrlrConvergenceMismatchError(
            "missing",
            `stream ${key} delivered event has no recognizable outcome`
          )
        }
        deliveredBusinessEventIds.push(event.eventId)
      }
    }
    if (streamBlocked) {
      blockedStreamCount += 1
    }
    const current = expectedByKey.get(key) as ExpectedUrlrEntity
    if (
      terminalEvent(events, stream.lastSequence, key).sourceVersion !==
      current.sourceVersion
    ) {
      throw new UrlrConvergenceMismatchError(
        "missing",
        `stream ${key} terminal sourceVersion does not match the retained population manifest`
      )
    }
  }

  if (pendingReadyCount + pendingFutureCount > 0) {
    throw new UrlrConvergenceMismatchError(
      "pending",
      `${pendingReadyCount + pendingFutureCount} in-scope outbox event(s) remain pending`
    )
  }
  if (processingCount + processingExpiredCount > 0) {
    throw new UrlrConvergenceMismatchError(
      "processing",
      `${processingCount + processingExpiredCount} in-scope outbox event(s) remain processing`
    )
  }
  if (statusCounts.failed > 0) {
    throw new UrlrConvergenceMismatchError(
      "failed",
      `${statusCounts.failed} in-scope outbox event(s) failed delivery`
    )
  }
  if (blockedStreamCount > 0) {
    throw new UrlrConvergenceMismatchError(
      "blocked",
      `${blockedStreamCount} in-scope outbox stream(s) are blocked`
    )
  }

  const receiptsByKey = new Map<string, UrlrReceiptRow>()
  for (const receipt of rows.receipts) {
    const key = expectedKeyOf(
      receipt.entityKind,
      receipt.entityId,
      receipt.market
    )
    if (!(key && expectedByKey.has(key))) {
      continue
    }
    const receiptKey = `${key}\0${receipt.streamSequence}`
    if (receiptsByKey.has(receiptKey)) {
      throw new UrlrConvergenceMismatchError(
        "extra",
        `entity ${key} has duplicate receipts at sequence ${receipt.streamSequence}`
      )
    }
    receiptsByKey.set(receiptKey, receipt)
  }
  if (
    receiptsByKey.size !== eventsByReceiptKey.size ||
    [...eventsByReceiptKey].some(([receiptKey, event]) => {
      const receipt = receiptsByKey.get(receiptKey)
      return !receipt || receipt.sourceEventId !== event.id
    })
  ) {
    throw new UrlrConvergenceMismatchError(
      "receipt",
      "URLR receipts do not exactly cover the in-scope outbox event history"
    )
  }
  const actionCounts: Record<string, number> = {}
  let missingCommandBindingCount = 0
  for (const receipt of receiptsByKey.values()) {
    bump(actionCounts, receipt.action)
    const hasCommand = receipt.commandIdempotencyKey !== null
    const requiresCommand = COMMAND_ACTIONS.has(receipt.action)
    if (
      receipt.action === "requires-publication" ||
      (requiresCommand && !hasCommand) ||
      (!requiresCommand &&
        receipt.action !== OPTIONAL_COMMAND_ACTION &&
        hasCommand)
    ) {
      missingCommandBindingCount += 1
    }
  }
  if (missingCommandBindingCount > 0) {
    throw new UrlrConvergenceMismatchError(
      "receipt",
      `${missingCommandBindingCount} URLR receipt(s) have an incomplete command binding`
    )
  }

  const cursorsByKey = new Map<string, UrlrCursorRow>()
  for (const cursor of rows.cursors) {
    const key = expectedKeyOf(cursor.entityKind, cursor.entityId, cursor.market)
    if (!(key && expectedByKey.has(key))) {
      continue
    }
    if (cursorsByKey.has(key)) {
      throw new UrlrConvergenceMismatchError(
        "extra",
        `entity ${key} has more than one URLR cursor`
      )
    }
    cursorsByKey.set(key, cursor)
  }
  let cursorMismatchCount = 0
  for (const key of expectedKeys) {
    const cursor = cursorsByKey.get(key)
    const stream = streamsByKey.get(key) as OutboxStreamRow
    if (!cursor || cursor.lastSequence !== stream.lastSequence) {
      cursorMismatchCount += 1
    }
  }
  if (cursorMismatchCount > 0) {
    throw new UrlrConvergenceMismatchError(
      "cursor",
      `${cursorMismatchCount} URLR cursor(s) do not reach their stream's terminal sequence`
    )
  }

  const routesByKey = new Map<string, UrlrActiveRouteRow>()
  const extraRouteKeys: string[] = []
  for (const route of rows.activeRoutes) {
    const key = expectedKeyOf(route.entityKind, route.entityId, route.market)
    if (!(key && expectedByKey.has(key))) {
      extraRouteKeys.push(
        key ?? `${route.entityKind}:${route.entityId}:${route.market}`
      )
      continue
    }
    if (routesByKey.has(key)) {
      throw new UrlrConvergenceMismatchError(
        "route",
        `entity ${key} has more than one active route`
      )
    }
    routesByKey.set(key, route)
  }
  const missingRouteKeys = expectedKeys.filter((key) => !routesByKey.has(key))
  if (extraRouteKeys.length > 0 || missingRouteKeys.length > 0) {
    throw new UrlrConvergenceMismatchError(
      "route",
      `route projection has ${missingRouteKeys.length} missing and ${extraRouteKeys.length} extra active route(s)`
    )
  }

  const expectedEntityKeysHash = sha256OfSortedKeys(expectedKeys)
  const expectedEventIdsHash = sha256OfSortedKeys(deliveredBusinessEventIds)
  const expectedStreamKeysHash = sha256OfSortedKeys(
    expected.map((entity) => entity.streamKey)
  )
  const sequenceStateHash = sha256OfCanonicalValue(
    expectedKeys.map((key) => ({
      key,
      lastSequence: (streamsByKey.get(key) as OutboxStreamRow).lastSequence,
    }))
  )
  const assignmentSetHash = sha256OfCanonicalValue(
    expectedKeys.map((key) => ({
      key,
      routeId: (routesByKey.get(key) as UrlrActiveRouteRow).routeId,
    }))
  )
  const identityHash = sha256OfCanonicalValue(
    [...receiptsByKey.entries()]
      .map(([receiptKey, receipt]) => ({
        action: receipt.action,
        receiptKey,
        sourceEventId: receipt.sourceEventId,
      }))
      .sort((left, right) =>
        left.receiptKey.localeCompare(right.receiptKey, "en")
      )
  )

  return {
    boundary: {
      expectedEntityCount: expected.length,
      expectedEntityKeysHash,
      expectedEventCount: deliveredBusinessEventIds.length,
      expectedEventIdsHash,
      expectedStreamCount: expected.length,
      expectedStreamKeysHash,
    },
    catalogScopeSha256: binding.catalogScopeSha256,
    generatedAt,
    kind: "herbatika-ro-urlr-convergence-proof" as const,
    market: "ro" as const,
    outbox: {
      blockedStreamCount,
      deliveredCount: deliveredBusinessEventIds.length,
      deliveryOutcomeCounts,
      expectedIdsObservedHash: expectedEventIdsHash,
      failedCount: statusCounts.failed,
      lastErrorCodeCounts,
      pendingFutureCount,
      pendingReadyCount,
      processingCount,
      processingExpiredCount,
      statusCounts,
    },
    releaseId: binding.releaseId,
    routeProjection: {
      activeEntityCount: routesByKey.size,
      activeEntityKeysHash: sha256OfSortedKeys([...routesByKey.keys()]),
      assignmentSetHash,
      extraCount: extraRouteKeys.length,
      missingCount: missingRouteKeys.length,
    },
    schemaVersion: 1 as const,
    staticTaxonomyConvergenceSha256: binding.staticTaxonomyConvergenceSha256,
    streams: {
      count: streamsByKey.size,
      keysHash: expectedStreamKeysHash,
      notDeliveredThroughLastSequenceCount: 0,
      sequenceStateHash,
    },
    urlrReceipts: {
      actionCounts,
      count: receiptsByKey.size,
      cursorMismatchCount,
      identityHash,
      missingCommandBindingCount,
    },
  }
}
