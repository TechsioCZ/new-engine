import { Pool } from "pg"
import type { SqlClient, SqlPool } from "../../src/lib/url-registry/postgres"
import { URL_REGISTRY_MIGRATION_MANIFEST_V8 } from "../../src/lib/url-registry/runtime/manifest"
import { assertAppliedMigrationManifest } from "../../src/lib/url-registry/runtime/migration-verifier"
import { sha256MarketReadinessValue } from "./urlr-convergence"

const MARKETS = ["sk", "cz", "hu", "ro"] as const
const CATALOG_KINDS = ["product", "category", "brand", "collection"] as const
const DEFAULT_STATEMENT_TIMEOUT_MS = 5000
const CONNECTION_TIMEOUT_MS = 8000
const BEGIN_READ_ONLY =
  "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
const SET_TIMEOUTS = `SELECT set_config('statement_timeout', $1, true), set_config('lock_timeout', $1, true)`

export type OutboxStreamRow = Readonly<{
  entityId: string
  entityKind: string
  id: string
  lastSequence: number
  market: string
  source: string
}>

export type OutboxEventRow = Readonly<{
  deliveryOutcome: null | string
  eventId: string
  id: string
  sourceVersion: null | string
  status: string
  streamId: string
  streamSequence: number
}>

export type EntityRouteRow = Readonly<{
  equivalenceKey: null | string
  indexPolicy: string
  kind: string
  market: string
  publicSlug: null | string
  sourceId: string
}>

export type StaticRouteRow = Readonly<{
  equivalenceKey: null | string
  indexPolicy: string
  market: string
  matchMode: null | string
  parentRouteKey: null | string
  routeKey: string
  routeStatus: string
  segment: null | string
}>

export type ReceiptRow = Readonly<{
  action: string
  commandIdempotencyKey: null | string
  entityId: string
  entityKind: string
  market: string
  sourceEventId: string
  streamSequence: number
}>

export type CursorRow = Readonly<{
  entityId: string
  entityKind: string
  lastSequence: number
  market: string
}>

export type FourMarketConvergenceRows = Readonly<{
  cursors: readonly CursorRow[]
  entityRoutes: readonly EntityRouteRow[]
  events: readonly OutboxEventRow[]
  migrationLedgerSha256: string
  receipts: readonly ReceiptRow[]
  staticRoutes: readonly StaticRouteRow[]
  streams: readonly OutboxStreamRow[]
}>

export type FourMarketConvergenceReader = Readonly<{
  close: () => Promise<void>
  read: () => Promise<FourMarketConvergenceRows>
}>

type ClosablePool = SqlPool & Readonly<{ end: () => Promise<void> }>
type PoolFactory = (connectionString: string) => ClosablePool

export type FourMarketConvergenceDbConfig = Readonly<{
  medusaDatabaseUrl: string
  statementTimeoutMs?: number
  urlRegistryDatabaseUrl: string
}>

const databaseUrl = (value: string, label: string): string => {
  if (!value || value.trim() !== value) {
    throw new Error(`four-market-readiness: ${label} is invalid`)
  }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`four-market-readiness: ${label} is invalid`)
  }
  if (!(parsed.protocol === "postgres:" || parsed.protocol === "postgresql:")) {
    throw new Error(`four-market-readiness: ${label} must use postgres`)
  }
  return value
}

const databaseAuthority = (value: string): string => {
  const parsed = new URL(value)
  const port = parsed.port || "5432"
  return `${parsed.hostname.toLowerCase()}:${port}${parsed.pathname}`
}

const statementTimeout = (value: number | undefined): number => {
  const timeout = value ?? DEFAULT_STATEMENT_TIMEOUT_MS
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 60_000) {
    throw new Error(
      "four-market-readiness: statementTimeoutMs must be 1..60000"
    )
  }
  return timeout
}

const rollbackQuietly = async (client: SqlClient) => {
  await client.query("ROLLBACK").catch(() => {
    // Preserve the authoritative read/validation error.
  })
}

const readOnlySnapshot = async <Value>(
  pool: SqlPool,
  timeoutMs: number,
  read: (client: SqlClient) => Promise<Value>
): Promise<Value> => {
  const client = await pool.connect()
  let transactionOpen = false
  try {
    await client.query(BEGIN_READ_ONLY)
    transactionOpen = true
    await client.query(SET_TIMEOUTS, [`${timeoutMs}ms`])
    const value = await read(client)
    await client.query("ROLLBACK")
    transactionOpen = false
    return value
  } catch (error) {
    if (transactionOpen) {
      await rollbackQuietly(client)
    }
    throw error
  } finally {
    client.release()
  }
}

const rows = async (
  client: SqlClient,
  sql: string
): Promise<readonly unknown[]> => (await client.query(sql)).rows

const medusaSnapshot = async (
  pool: SqlPool,
  timeoutMs: number
): Promise<Pick<FourMarketConvergenceRows, "events" | "streams">> =>
  readOnlySnapshot(pool, timeoutMs, async (client) => {
    const [streamRows, eventRows] = await Promise.all([
      rows(
        client,
        `SELECT id, source, entity_kind, entity_id, market_code, last_sequence
         FROM url_registry_outbox_stream
         WHERE source = 'medusa'
           AND market_code = ANY (ARRAY['sk','cz','hu','ro'])
           AND entity_kind = ANY (ARRAY['product','category','brand','collection'])
           AND deleted_at IS NULL`
      ),
      rows(
        client,
        `SELECT event.id, event.stream_id, event.stream_sequence, event.event_id,
                event.status, event.delivery_outcome,
                event.payload ->> 'sourceVersion' AS source_version
         FROM url_registry_outbox_event AS event
         JOIN url_registry_outbox_stream AS stream ON stream.id = event.stream_id
         WHERE stream.source = 'medusa'
           AND stream.market_code = ANY (ARRAY['sk','cz','hu','ro'])
           AND stream.entity_kind = ANY (ARRAY['product','category','brand','collection'])
           AND stream.deleted_at IS NULL AND event.deleted_at IS NULL`
      ),
    ])
    return {
      events: eventRows.map((value) => {
        const row = value as Record<string, unknown>
        return {
          deliveryOutcome: row.delivery_outcome as null | string,
          eventId: row.event_id as string,
          id: row.id as string,
          sourceVersion: row.source_version as null | string,
          status: row.status as string,
          streamId: row.stream_id as string,
          streamSequence: row.stream_sequence as number,
        }
      }),
      streams: streamRows.map((value) => {
        const row = value as Record<string, unknown>
        return {
          entityId: row.entity_id as string,
          entityKind: row.entity_kind as string,
          id: row.id as string,
          lastSequence: row.last_sequence as number,
          market: row.market_code as string,
          source: row.source as string,
        }
      }),
    }
  })

const urlrSnapshot = async (
  pool: SqlPool,
  timeoutMs: number
): Promise<
  Pick<
    FourMarketConvergenceRows,
    | "cursors"
    | "entityRoutes"
    | "migrationLedgerSha256"
    | "receipts"
    | "staticRoutes"
  >
> =>
  readOnlySnapshot(pool, timeoutMs, async (client) => {
    const [ledger, routeRows, staticRows, receiptRows, cursorRows] =
      await Promise.all([
        rows(
          client,
          "SELECT name, checksum FROM url_registry.schema_migrations ORDER BY name ASC"
        ),
        rows(
          client,
          `SELECT route.market, route.kind, route.source_id,
                  route.equivalence_key, route.index_policy,
                  slug.normalized_slug AS public_slug
           FROM url_registry.url_route AS route
           LEFT JOIN url_registry.url_entity_slug AS slug
             ON slug.route_id = route.id AND slug.disposition = 'current'
           WHERE route.target_type = 'entity'
             AND route.source_system = 'medusa'
             AND route.market = ANY (ARRAY['sk','cz','hu','ro'])
             AND route.kind = ANY (ARRAY['product','category','brand','collection'])
             AND route.status = 'active'`
        ),
        rows(
          client,
          `SELECT route.market, route.static_route_key AS route_key,
                  route.equivalence_key, route.index_policy,
                  route.status AS route_status, path.parent_route_key,
                  path.segment, path.match_mode
           FROM url_registry.url_route AS route
           LEFT JOIN url_registry.static_route_path AS path
             ON path.market = route.market
            AND path.route_key = route.static_route_key
            AND path.disposition = 'current'
           WHERE route.target_type = 'static'
             AND route.market = ANY (ARRAY['sk','cz','hu','ro'])
             AND (route.status = 'active' OR path.disposition = 'current')`
        ),
        rows(
          client,
          `SELECT source_type, source_id, market, stream_sequence,
                  source_event_id, action, command_idempotency_key
           FROM url_registry.url_registry_source_event_receipt
           WHERE source_system = 'medusa'
             AND market = ANY (ARRAY['sk','cz','hu','ro'])
             AND source_type = ANY (ARRAY['product','category','brand','collection'])`
        ),
        rows(
          client,
          `SELECT source_type, source_id, market, last_sequence
           FROM url_registry.url_registry_source_event_cursor
           WHERE source_system = 'medusa'
             AND market = ANY (ARRAY['sk','cz','hu','ro'])
             AND source_type = ANY (ARRAY['product','category','brand','collection'])`
        ),
      ])
    assertAppliedMigrationManifest(ledger)
    if (ledger.length !== URL_REGISTRY_MIGRATION_MANIFEST_V8.length) {
      throw new Error(
        "four-market-readiness: migration ledger does not exactly match this build"
      )
    }
    return {
      cursors: cursorRows.map((value) => {
        const row = value as Record<string, unknown>
        return {
          entityId: row.source_id as string,
          entityKind: row.source_type as string,
          lastSequence: row.last_sequence as number,
          market: row.market as string,
        }
      }),
      entityRoutes: routeRows.map((value) => {
        const row = value as Record<string, unknown>
        return {
          equivalenceKey: row.equivalence_key as null | string,
          indexPolicy: row.index_policy as string,
          kind: row.kind as string,
          market: row.market as string,
          publicSlug: row.public_slug as null | string,
          sourceId: row.source_id as string,
        }
      }),
      migrationLedgerSha256: sha256MarketReadinessValue(ledger),
      receipts: receiptRows.map((value) => {
        const row = value as Record<string, unknown>
        return {
          action: row.action as string,
          commandIdempotencyKey: row.command_idempotency_key as null | string,
          entityId: row.source_id as string,
          entityKind: row.source_type as string,
          market: row.market as string,
          sourceEventId: row.source_event_id as string,
          streamSequence: row.stream_sequence as number,
        }
      }),
      staticRoutes: staticRows.map((value) => {
        const row = value as Record<string, unknown>
        return {
          equivalenceKey: row.equivalence_key as null | string,
          indexPolicy: row.index_policy as string,
          market: row.market as string,
          matchMode: row.match_mode as null | string,
          parentRouteKey: row.parent_route_key as null | string,
          routeKey: row.route_key as string,
          routeStatus: row.route_status as string,
          segment: row.segment as null | string,
        }
      }),
    }
  })

const defaultPoolFactory: PoolFactory = (connectionString) =>
  new Pool({
    connectionString,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    max: 1,
  }) as unknown as ClosablePool

export const createFourMarketConvergenceReader = (
  config: FourMarketConvergenceDbConfig,
  dependencies: Readonly<{ poolFactory?: PoolFactory }> = {}
): FourMarketConvergenceReader => {
  const timeoutMs = statementTimeout(config.statementTimeoutMs)
  const poolFactory = dependencies.poolFactory ?? defaultPoolFactory
  const medusaDatabaseUrl = databaseUrl(
    config.medusaDatabaseUrl,
    "DATABASE_URL"
  )
  const urlRegistryDatabaseUrl = databaseUrl(
    config.urlRegistryDatabaseUrl,
    "URL_REGISTRY_DATABASE_URL"
  )
  if (
    databaseAuthority(medusaDatabaseUrl) ===
    databaseAuthority(urlRegistryDatabaseUrl)
  ) {
    throw new Error(
      "four-market-readiness: DATABASE_URL and URL_REGISTRY_DATABASE_URL must be distinct"
    )
  }
  const medusaPool = poolFactory(medusaDatabaseUrl)
  const urlRegistryPool = poolFactory(urlRegistryDatabaseUrl)
  return {
    close: async () => {
      await Promise.all([medusaPool.end(), urlRegistryPool.end()])
    },
    read: async () => {
      const [medusa, urlRegistry] = await Promise.all([
        medusaSnapshot(medusaPool, timeoutMs),
        urlrSnapshot(urlRegistryPool, timeoutMs),
      ])
      return { ...medusa, ...urlRegistry }
    },
  }
}

export const FOUR_MARKET_READINESS_DATABASE_SCOPE = Object.freeze({
  catalogKinds: CATALOG_KINDS,
  markets: MARKETS,
})
