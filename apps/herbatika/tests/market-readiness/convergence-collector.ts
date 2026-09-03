import { parsePopulationManifest } from "../../src/lib/url-registry/population/manifest"
import {
  POPULATION_CATALOG_KINDS,
  POPULATION_MARKETS,
} from "../../src/lib/url-registry/population/manifest-contracts"
import type {
  CursorRow,
  FourMarketConvergenceRows,
  OutboxEventRow,
  OutboxStreamRow,
  ReceiptRow,
} from "./convergence-db"
import {
  buildFourMarketStaticTaxonomyConvergence,
  type FourMarketStaticTaxonomyConvergence,
  type SegmentRegistryArtifactRef,
  type StaticTaxonomyMarketHealth,
  type StaticTaxonomyProjection,
} from "./static-taxonomy-convergence"
import {
  buildFourMarketUrlrConvergence,
  expectedUrlrCatalogProjections,
  type FourMarketUrlrConvergence,
  type ReadinessCatalogKind,
  type ReadinessMarket,
  type UrlrCatalogProjection,
  type UrlrMarketHealth,
} from "./urlr-convergence"

const DELIVERED_OUTCOMES = new Set(["already-applied", "applied", "noop-stale"])
const COMMAND_ACTIONS = new Set(["published", "retired", "slug-changed"])
const NO_COMMAND_ACTIONS = new Set([
  "noop-route-missing",
  "noop-route-terminal",
  "noop-source-missing",
  "noop-source-present",
  "noop-unpublished",
])

export type FourMarketConvergenceIdentity = Readonly<{
  environmentId: string
  generatedAt: string
  releaseId: string
}>

export type FourMarketConvergenceArtifacts = Readonly<{
  staticTaxonomy: FourMarketStaticTaxonomyConvergence
  urlRegistry: FourMarketUrlrConvergence
}>

const market = (value: string, label: string): ReadinessMarket => {
  if (!POPULATION_MARKETS.includes(value as ReadinessMarket)) {
    throw new Error(`four-market-readiness: ${label} has invalid market`)
  }
  return value as ReadinessMarket
}

const kind = (value: string, label: string): ReadinessCatalogKind => {
  if (!POPULATION_CATALOG_KINDS.includes(value as ReadinessCatalogKind)) {
    throw new Error(`four-market-readiness: ${label} has invalid kind`)
  }
  return value as ReadinessCatalogKind
}

const entityKey = (
  marketCode: string,
  entityKind: string,
  entityId: string
): string => `${marketCode}:${entityKind}:${entityId}`

const zeroUrlrHealth = (): Record<ReadinessMarket, UrlrMarketHealth> =>
  Object.fromEntries(
    POPULATION_MARKETS.map((marketCode) => [
      marketCode,
      {
        conflictCount: 0,
        failedCount: 0,
        market: marketCode,
        pendingCount: 0,
        processingCount: 0,
      },
    ])
  ) as Record<ReadinessMarket, UrlrMarketHealth>

const bump = (
  health: Record<ReadinessMarket, UrlrMarketHealth>,
  marketCode: ReadinessMarket,
  field: keyof Pick<
    UrlrMarketHealth,
    "conflictCount" | "failedCount" | "pendingCount" | "processingCount"
  >,
  amount = 1
) => {
  health[marketCode] = {
    ...health[marketCode],
    [field]: health[marketCode][field] + amount,
  }
}

const eventsByStream = (
  events: readonly OutboxEventRow[]
): ReadonlyMap<string, readonly OutboxEventRow[]> => {
  const result = new Map<string, OutboxEventRow[]>()
  for (const event of events) {
    const bucket = result.get(event.streamId) ?? []
    bucket.push(event)
    result.set(event.streamId, bucket)
  }
  return result
}

type HealthState = Record<ReadinessMarket, UrlrMarketHealth>

const indexStreams = (
  streams: readonly OutboxStreamRow[],
  expectedByKey: ReadonlyMap<string, UrlrCatalogProjection>,
  health: HealthState
) => {
  const byKey = new Map<string, OutboxStreamRow[]>()
  const keyById = new Map<string, string>()
  for (const stream of streams) {
    const marketCode = market(stream.market, "outbox stream")
    const entityKind = kind(stream.entityKind, "outbox stream")
    const key = entityKey(marketCode, entityKind, stream.entityId)
    const bucket = byKey.get(key) ?? []
    bucket.push(stream)
    byKey.set(key, bucket)
    keyById.set(stream.id, key)
    if (stream.source !== "medusa" || !expectedByKey.has(key)) {
      bump(health, marketCode, "conflictCount")
    }
  }
  return { byKey, keyById }
}

const indexReceipts = (
  receipts: readonly ReceiptRow[],
  health: HealthState
): ReadonlyMap<string, ReceiptRow> => {
  const result = new Map<string, ReceiptRow>()
  for (const receipt of receipts) {
    const marketCode = market(receipt.market, "URLR receipt")
    const entityKind = kind(receipt.entityKind, "URLR receipt")
    const key = `${entityKey(
      marketCode,
      entityKind,
      receipt.entityId
    )}:${receipt.streamSequence}`
    if (result.has(key)) {
      bump(health, marketCode, "conflictCount")
    }
    const hasCommand = receipt.commandIdempotencyKey !== null
    const validBinding =
      (COMMAND_ACTIONS.has(receipt.action) && hasCommand) ||
      receipt.action === "unpublished" ||
      (NO_COMMAND_ACTIONS.has(receipt.action) && !hasCommand)
    if (!validBinding) {
      bump(health, marketCode, "conflictCount")
    }
    result.set(key, receipt)
  }
  return result
}

const indexCursors = (
  cursors: readonly CursorRow[],
  health: HealthState
): ReadonlyMap<string, CursorRow> => {
  const result = new Map<string, CursorRow>()
  for (const cursor of cursors) {
    const marketCode = market(cursor.market, "URLR cursor")
    const entityKind = kind(cursor.entityKind, "URLR cursor")
    const key = entityKey(marketCode, entityKind, cursor.entityId)
    if (result.has(key)) {
      bump(health, marketCode, "conflictCount")
    }
    result.set(key, cursor)
  }
  return result
}

const evaluateEvent = (
  event: OutboxEventRow,
  expectedSequence: number,
  marketCode: ReadinessMarket,
  health: HealthState
) => {
  if (
    event.streamSequence !== expectedSequence ||
    !event.id ||
    !event.eventId
  ) {
    bump(health, marketCode, "conflictCount")
  }
  if (["pending", "processing", "failed"].includes(event.status)) {
    bump(
      health,
      marketCode,
      `${event.status}Count` as keyof Pick<
        UrlrMarketHealth,
        "failedCount" | "pendingCount" | "processingCount"
      >
    )
  } else if (
    event.status !== "delivered" ||
    !DELIVERED_OUTCOMES.has(event.deliveryOutcome ?? "")
  ) {
    bump(health, marketCode, "conflictCount")
  }
}

const evaluateExpectedStream = (
  input: Readonly<{
    cursors: ReadonlyMap<string, CursorRow>
    eventBuckets: ReadonlyMap<string, readonly OutboxEventRow[]>
    expected: UrlrCatalogProjection
    health: HealthState
    key: string
    receipts: ReadonlyMap<string, ReceiptRow>
    streams: readonly OutboxStreamRow[]
    terminalVersions: Map<string, string>
  }>
) => {
  const { expected, health, key, streams } = input
  if (streams.length !== 1) {
    bump(health, expected.market, "conflictCount")
    return
  }
  const stream = streams[0] as OutboxStreamRow
  const events = [...(input.eventBuckets.get(stream.id) ?? [])].sort(
    (left, right) => left.streamSequence - right.streamSequence
  )
  if (
    !Number.isSafeInteger(stream.lastSequence) ||
    stream.lastSequence < 1 ||
    events.length !== stream.lastSequence
  ) {
    bump(health, expected.market, "conflictCount")
  }
  for (const [index, event] of events.entries()) {
    evaluateEvent(event, index + 1, expected.market, health)
    const receipt = input.receipts.get(`${key}:${event.streamSequence}`)
    if (!receipt || receipt.sourceEventId !== event.id) {
      bump(health, expected.market, "conflictCount")
    }
  }
  if (input.cursors.get(key)?.lastSequence !== stream.lastSequence) {
    bump(health, expected.market, "conflictCount")
  }
  const terminal = events.at(-1)
  if (terminal?.sourceVersion === expected.sourceVersion) {
    input.terminalVersions.set(key, terminal.sourceVersion)
  } else {
    bump(health, expected.market, "conflictCount")
  }
}

const countUnexpectedRows = (
  rows: FourMarketConvergenceRows,
  expectedByKey: ReadonlyMap<string, UrlrCatalogProjection>,
  streamKeyById: ReadonlyMap<string, string>,
  health: HealthState
) => {
  const expectedReceiptKeys = new Set<string>()
  for (const event of rows.events) {
    const key = streamKeyById.get(event.streamId)
    if (!key) {
      throw new Error(
        "four-market-readiness: outbox event has no in-scope stream"
      )
    }
    expectedReceiptKeys.add(`${key}:${event.streamSequence}`)
  }
  for (const receipt of rows.receipts) {
    const marketCode = market(receipt.market, "URLR receipt")
    const itemKind = kind(receipt.entityKind, "URLR receipt")
    const key = entityKey(marketCode, itemKind, receipt.entityId)
    if (
      !(
        expectedByKey.has(key) &&
        expectedReceiptKeys.has(`${key}:${receipt.streamSequence}`)
      )
    ) {
      bump(health, marketCode, "conflictCount")
    }
  }
  for (const item of rows.cursors) {
    const marketCode = market(item.market, "URLR tracking row")
    const itemKind = kind(item.entityKind, "URLR tracking row")
    if (!expectedByKey.has(entityKey(marketCode, itemKind, item.entityId))) {
      bump(health, marketCode, "conflictCount")
    }
  }
}

const collectOutboxHealth = (
  expected: readonly UrlrCatalogProjection[],
  rows: FourMarketConvergenceRows
): Readonly<{
  health: readonly UrlrMarketHealth[]
  terminalVersions: ReadonlyMap<string, string>
}> => {
  const health = zeroUrlrHealth()
  const expectedByKey = new Map(
    expected.map((item) => [
      entityKey(item.market, item.kind, item.sourceId),
      item,
    ])
  )
  const { byKey: streamsByKey, keyById: streamKeyById } = indexStreams(
    rows.streams,
    expectedByKey,
    health
  )
  const eventBuckets = eventsByStream(rows.events)
  const receiptsByKey = indexReceipts(rows.receipts, health)
  const cursorsByKey = indexCursors(rows.cursors, health)
  const terminalVersions = new Map<string, string>()

  for (const [key, expectedItem] of expectedByKey) {
    evaluateExpectedStream({
      cursors: cursorsByKey,
      eventBuckets,
      expected: expectedItem,
      health,
      key,
      receipts: receiptsByKey,
      streams: streamsByKey.get(key) ?? [],
      terminalVersions,
    })
  }
  countUnexpectedRows(rows, expectedByKey, streamKeyById, health)
  return {
    health: POPULATION_MARKETS.map((code) => health[code]),
    terminalVersions,
  }
}

const entityProjections = (
  manifestValue: unknown,
  rows: FourMarketConvergenceRows,
  terminalVersions: ReadonlyMap<string, string>
): readonly UrlrCatalogProjection[] => {
  const manifest = parsePopulationManifest(manifestValue)
  const bindings = new Map(
    manifest.bindings.map((binding) => [binding.market, binding])
  )
  const expected = new Map(
    expectedUrlrCatalogProjections(manifest).map((item) => [
      entityKey(item.market, item.kind, item.sourceId),
      item,
    ])
  )
  return rows.entityRoutes.map((route) => {
    const marketCode = market(route.market, "entity route")
    const entityKind = kind(route.kind, "entity route")
    const key = entityKey(marketCode, entityKind, route.sourceId)
    const binding = bindings.get(marketCode)
    const expectedItem = expected.get(key)
    if (!(binding && route.equivalenceKey && route.publicSlug)) {
      throw new Error("four-market-readiness: entity route is incomplete")
    }
    return {
      equivalenceKey: route.equivalenceKey,
      indexPolicy: route.indexPolicy as "indexable" | "noindex",
      kind: entityKind,
      locale: binding.locale,
      market: marketCode,
      publicSlug: route.publicSlug,
      salesChannelId: binding.salesChannelId,
      sourceId: route.sourceId,
      sourceVersion:
        terminalVersions.get(key) ??
        expectedItem?.sourceVersion ??
        "unverified",
    }
  })
}

const staticProjections = (
  rows: FourMarketConvergenceRows
): readonly StaticTaxonomyProjection[] => {
  const byMarketAndKey = new Map(
    rows.staticRoutes.map((route) => [
      `${route.market}:${route.routeKey}`,
      route,
    ])
  )
  const pathFor = (marketCode: ReadinessMarket, routeKey: string): string => {
    const segments: string[] = []
    const seen = new Set<string>()
    let current: string | null = routeKey
    while (current) {
      if (seen.has(current)) {
        throw new Error("four-market-readiness: static route parent cycle")
      }
      seen.add(current)
      const route = byMarketAndKey.get(`${marketCode}:${current}`)
      if (!route?.segment) {
        throw new Error("four-market-readiness: static route parent is missing")
      }
      segments.unshift(route.segment)
      current = route.parentRouteKey
    }
    return `/${segments.join("/")}`
  }
  return rows.staticRoutes.map((route) => {
    const marketCode = market(route.market, "static route")
    if (
      route.routeStatus !== "active" ||
      !route.equivalenceKey ||
      !route.matchMode ||
      !route.segment
    ) {
      throw new Error("four-market-readiness: static route is incomplete")
    }
    return {
      equivalenceKey: route.equivalenceKey,
      indexPolicy: route.indexPolicy as "indexable" | "noindex",
      market: marketCode,
      matchMode: route.matchMode as "exact" | "prefix",
      parentRouteKey: route.parentRouteKey,
      path: pathFor(marketCode, route.routeKey),
      routeKey: route.routeKey,
      segment: route.segment,
    }
  })
}

export const collectFourMarketConvergenceArtifacts = (
  input: Readonly<{
    identity: FourMarketConvergenceIdentity
    manifest: unknown
    rows: FourMarketConvergenceRows
    segmentRegistryByMarket: Readonly<
      Record<ReadinessMarket, SegmentRegistryArtifactRef>
    >
  }>
): FourMarketConvergenceArtifacts => {
  const manifest = parsePopulationManifest(input.manifest)
  const expected = expectedUrlrCatalogProjections(manifest)
  const outbox = collectOutboxHealth(expected, input.rows)
  const staticHealth: StaticTaxonomyMarketHealth[] = POPULATION_MARKETS.map(
    (marketCode) => ({
      conflictCount: 0,
      failedCount: 0,
      market: marketCode,
      pendingCount: 0,
    })
  )
  const shared = {
    environmentId: input.identity.environmentId,
    generatedAt: input.identity.generatedAt,
    manifest,
    migrationLedgerSha256: input.rows.migrationLedgerSha256,
    releaseId: input.identity.releaseId,
  }
  return {
    staticTaxonomy: buildFourMarketStaticTaxonomyConvergence({
      ...shared,
      health: staticHealth,
      observedProjections: staticProjections(input.rows),
      segmentRegistryByMarket: input.segmentRegistryByMarket,
    }),
    urlRegistry: buildFourMarketUrlrConvergence({
      ...shared,
      health: outbox.health,
      observedProjections: entityProjections(
        manifest,
        input.rows,
        outbox.terminalVersions
      ),
    }),
  }
}
