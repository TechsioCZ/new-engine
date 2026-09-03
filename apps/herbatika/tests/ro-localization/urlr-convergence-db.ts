// Read-only data access for the URLR convergence evidence generator. Two
// distinct Postgres databases are involved:
//  - the Medusa backend database, owner of `url_registry_outbox_stream` /
//    `url_registry_outbox_event`;
//  - the URL Registry database, owner of the `url_registry` schema
//    (`url_registry_source_event_receipt`, `url_registry_source_event_cursor`,
//    `url_route`).
// Every query runs inside an explicit read-only transaction with a short
// statement timeout, and this module never logs a connection string,
// credential, or raw row payload — only counts flow into logs/errors.
import { Pool, type QueryResultRow } from "pg"
import {
  RO_CATALOG_IMPORTER_SOURCE,
  RO_MARKET_CODE,
} from "./urlr-convergence-identity"

const DEFAULT_STATEMENT_TIMEOUT_MS = 5000
const DEFAULT_QUERY_TIMEOUT_MS = 8000

export type OutboxStreamRow = Readonly<{
  entityId: string
  entityKind: string
  id: string
  lastSequence: number
  marketCode: string
  source: string
}>

export type OutboxEventRow = Readonly<{
  availableAt: string
  deliveryOutcome: null | string
  eventId: string
  id: string
  lastErrorCode: null | string
  leaseExpiresAt: null | string
  sourceVersion: string
  status: "delivered" | "failed" | "pending" | "processing"
  streamId: string
  streamSequence: number
}>

export type UrlrReceiptRow = Readonly<{
  action: string
  commandIdempotencyKey: null | string
  entityId: string
  entityKind: string
  market: string
  sourceEventId: string
  streamSequence: number
}>

export type UrlrCursorRow = Readonly<{
  entityId: string
  entityKind: string
  lastSequence: number
  market: string
}>

export type UrlrActiveRouteRow = Readonly<{
  entityId: string
  entityKind: string
  market: string
  routeId: string
}>

export type UrlrConvergenceDbReader = Readonly<{
  readMedusaOutboxEvents: () => Promise<readonly OutboxEventRow[]>
  readMedusaOutboxStreams: () => Promise<readonly OutboxStreamRow[]>
  readUrlrActiveRoutes: () => Promise<readonly UrlrActiveRouteRow[]>
  readUrlrCursors: () => Promise<readonly UrlrCursorRow[]>
  readUrlrReceipts: () => Promise<readonly UrlrReceiptRow[]>
}>

export type UrlrConvergenceDbConfig = Readonly<{
  medusaDatabaseUrl: string
  statementTimeoutMs?: number
  urlRegistryDatabaseUrl: string
}>

const runReadOnly = async <Row extends QueryResultRow>(
  pool: Pool,
  statementTimeoutMs: number,
  sql: string,
  params: readonly unknown[]
): Promise<readonly Row[]> => {
  const client = await pool.connect()
  try {
    await client.query("BEGIN TRANSACTION READ ONLY")
    try {
      await client.query(`SET LOCAL statement_timeout = ${statementTimeoutMs}`)
      const result = await client.query<Row>(sql, params as unknown[])
      await client.query("COMMIT")
      return result.rows
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {
        // Preserve the original read failure if rollback also fails.
      })
      throw error
    }
  } finally {
    client.release()
  }
}

/**
 * Builds a production reader over two live Postgres connections. Connection
 * strings are held only as opaque config and are never interpolated into
 * error messages or logs.
 */
export const createPgUrlrConvergenceReader = (
  config: UrlrConvergenceDbConfig
): UrlrConvergenceDbReader & Readonly<{ close: () => Promise<void> }> => {
  const statementTimeoutMs =
    config.statementTimeoutMs ?? DEFAULT_STATEMENT_TIMEOUT_MS
  if (
    !Number.isInteger(statementTimeoutMs) ||
    statementTimeoutMs <= 0 ||
    statementTimeoutMs > 60_000
  ) {
    throw new Error(
      "urlr-convergence: statementTimeoutMs must be a positive integer at most 60000"
    )
  }
  const medusaPool = new Pool({
    connectionString: config.medusaDatabaseUrl,
    connectionTimeoutMillis: DEFAULT_QUERY_TIMEOUT_MS,
    max: 2,
  })
  const urlRegistryPool = new Pool({
    connectionString: config.urlRegistryDatabaseUrl,
    connectionTimeoutMillis: DEFAULT_QUERY_TIMEOUT_MS,
    max: 2,
  })

  const readMedusaOutboxStreams = async () =>
    runReadOnly<{
      entity_id: string
      entity_kind: string
      id: string
      last_sequence: number
      market_code: string
      source: string
    }>(
      medusaPool,
      statementTimeoutMs,
      `SELECT id, source, entity_kind, entity_id, market_code, last_sequence
       FROM url_registry_outbox_stream
       WHERE source = $1 AND market_code = $2 AND deleted_at IS NULL`,
      [RO_CATALOG_IMPORTER_SOURCE, RO_MARKET_CODE]
    ).then((rows) =>
      rows.map((row) => ({
        entityId: row.entity_id,
        entityKind: row.entity_kind,
        id: row.id,
        lastSequence: row.last_sequence,
        marketCode: row.market_code,
        source: row.source,
      }))
    )

  const readMedusaOutboxEvents = async () =>
    runReadOnly<{
      available_at: string
      delivery_outcome: null | string
      event_id: string
      id: string
      last_error_code: null | string
      lease_expires_at: null | string
      source_version: string
      status: "delivered" | "failed" | "pending" | "processing"
      stream_id: string
      stream_sequence: number
    }>(
      medusaPool,
      statementTimeoutMs,
      `SELECT id, stream_id, stream_sequence, event_id, status, delivery_outcome,
              last_error_code, available_at, lease_expires_at,
              payload ->> 'sourceVersion' AS source_version
       FROM url_registry_outbox_event
       WHERE source = $1 AND market_code = $2 AND deleted_at IS NULL`,
      [RO_CATALOG_IMPORTER_SOURCE, RO_MARKET_CODE]
    ).then((rows) =>
      rows.map((row) => ({
        availableAt: row.available_at,
        deliveryOutcome: row.delivery_outcome,
        eventId: row.event_id,
        id: row.id,
        lastErrorCode: row.last_error_code,
        leaseExpiresAt: row.lease_expires_at,
        sourceVersion: row.source_version,
        status: row.status,
        streamId: row.stream_id,
        streamSequence: row.stream_sequence,
      }))
    )

  const readUrlrReceipts = async () =>
    runReadOnly<{
      action: string
      command_idempotency_key: null | string
      market: string
      source_event_id: string
      source_id: string
      source_type: string
      stream_sequence: number
    }>(
      urlRegistryPool,
      statementTimeoutMs,
      `SELECT source_type, source_id, market, stream_sequence, source_event_id,
              action, command_idempotency_key
       FROM url_registry.url_registry_source_event_receipt
       WHERE source_system = $1 AND market = $2`,
      [RO_CATALOG_IMPORTER_SOURCE, RO_MARKET_CODE]
    ).then((rows) =>
      rows.map((row) => ({
        action: row.action,
        commandIdempotencyKey: row.command_idempotency_key,
        entityId: row.source_id,
        entityKind: row.source_type,
        market: row.market,
        sourceEventId: row.source_event_id,
        streamSequence: row.stream_sequence,
      }))
    )

  const readUrlrCursors = async () =>
    runReadOnly<{
      last_sequence: number
      market: string
      source_id: string
      source_type: string
    }>(
      urlRegistryPool,
      statementTimeoutMs,
      `SELECT source_type, source_id, market, last_sequence
       FROM url_registry.url_registry_source_event_cursor
       WHERE source_system = $1 AND market = $2`,
      [RO_CATALOG_IMPORTER_SOURCE, RO_MARKET_CODE]
    ).then((rows) =>
      rows.map((row) => ({
        entityId: row.source_id,
        entityKind: row.source_type,
        lastSequence: row.last_sequence,
        market: row.market,
      }))
    )

  const readUrlrActiveRoutes = async () =>
    runReadOnly<{
      id: string
      market: string
      source_id: string
      source_type: string
    }>(
      urlRegistryPool,
      statementTimeoutMs,
      `SELECT id, source_type, source_id, market
       FROM url_registry.url_route
       WHERE market = $1 AND target_type = 'entity'
         AND source_system = $2 AND status = 'active'`,
      [RO_MARKET_CODE, RO_CATALOG_IMPORTER_SOURCE]
    ).then((rows) =>
      rows.map((row) => ({
        entityId: row.source_id,
        entityKind: row.source_type,
        market: row.market,
        routeId: row.id,
      }))
    )

  return {
    close: async () => {
      await Promise.all([medusaPool.end(), urlRegistryPool.end()])
    },
    readMedusaOutboxEvents,
    readMedusaOutboxStreams,
    readUrlrActiveRoutes,
    readUrlrCursors,
    readUrlrReceipts,
  }
}
