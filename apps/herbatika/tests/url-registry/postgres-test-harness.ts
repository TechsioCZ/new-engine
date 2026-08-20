import { Pool, type PoolClient } from "pg"
import {
  createPostgresUrlRegistry,
  type SqlClient,
  type SqlPool,
  type SqlQueryResult,
} from "@/lib/url-registry/postgres"

const MIGRATION_URL_ENV = "URL_REGISTRY_PG18_TEST_MIGRATION_DATABASE_URL"
const RUNTIME_URL_ENV = "URL_REGISTRY_PG18_TEST_RUNTIME_DATABASE_URL"

const requiredUrl = (name: string): string => {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `${name} is required; run tests/url-registry/run-pg18-gate.mjs`
    )
  }
  const parsed = new URL(value)
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error(`${name} must use the PostgreSQL protocol`)
  }
  return value
}

const sqlResult = (value: {
  rows: readonly unknown[]
  rowCount: number | null
}): SqlQueryResult => ({ rows: value.rows, rowCount: value.rowCount })

class PgClientAdapter implements SqlClient {
  private readonly client: PoolClient

  constructor(client: PoolClient) {
    this.client = client
  }

  async query(
    sql: string,
    values: readonly unknown[] = []
  ): Promise<SqlQueryResult> {
    return sqlResult(await this.client.query(sql, [...values]))
  }

  release(error?: Error | boolean): void {
    this.client.release(error)
  }
}

class PgPoolAdapter implements SqlPool {
  private readonly pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  async query(
    sql: string,
    values: readonly unknown[] = []
  ): Promise<SqlQueryResult> {
    return sqlResult(await this.pool.query(sql, [...values]))
  }

  async connect(): Promise<SqlClient> {
    return new PgClientAdapter(await this.pool.connect())
  }
}

export type ArtifactCounts = Readonly<{
  audits: number
  commands: number
  outbox: number
}>

export const rejectionCodes = (
  results: readonly PromiseSettledResult<unknown>[]
) =>
  results.flatMap((result) =>
    result.status === "rejected" &&
    typeof result.reason === "object" &&
    result.reason !== null &&
    "code" in result.reason &&
    typeof result.reason.code === "string"
      ? [result.reason.code]
      : []
  )

export type PostgresTestContext = Readonly<{
  admin: Pool
  close(): Promise<void>
  countArtifacts(idempotencyKeys: readonly string[]): Promise<ArtifactCounts>
  nextNamespace(prefix?: string): string
  registry: ReturnType<typeof createPostgresUrlRegistry>
  reset(): Promise<void>
  runtime: Pool
  sqlPool: SqlPool
}>

const integer = (value: unknown, label: string): number => {
  const parsed = typeof value === "string" ? Number(value) : value
  if (!Number.isSafeInteger(parsed) || (parsed as number) < 0) {
    throw new Error(`Invalid ${label}: ${String(value)}`)
  }
  return parsed as number
}

export const createPostgresTestContext = (): PostgresTestContext => {
  const migrationUrl = requiredUrl(MIGRATION_URL_ENV)
  const runtimeUrl = requiredUrl(RUNTIME_URL_ENV)
  if (migrationUrl === runtimeUrl) {
    throw new Error("Migration and runtime test URLs must be distinct")
  }
  const admin = new Pool({ connectionString: migrationUrl, max: 4 })
  const runtime = new Pool({ connectionString: runtimeUrl, max: 24 })
  const sqlPool = new PgPoolAdapter(runtime)
  const registry = createPostgresUrlRegistry(sqlPool, {
    transaction: { maxAttempts: 3 },
  })
  let namespaceCounter = 0

  const reset = async () => {
    await admin.query(`TRUNCATE TABLE
      url_registry.url_registry_source_event_cursor,
      url_registry.url_registry_source_event_receipt,
      url_registry.url_registry_invalidation_outbox,
      url_registry.url_registry_audit,
      url_registry.url_registry_command,
      url_registry.static_route_path,
      url_registry.url_entity_slug,
      url_registry.url_route
      RESTART IDENTITY`)
  }

  const countArtifacts = async (
    idempotencyKeys: readonly string[]
  ): Promise<ArtifactCounts> => {
    const counted = await admin.query(
      `SELECT
         (SELECT count(*) FROM url_registry.url_registry_command
           WHERE idempotency_key = ANY($1::text[]))::text AS commands,
         (SELECT count(*) FROM url_registry.url_registry_audit
           WHERE command_idempotency_key = ANY($1::text[]))::text AS audits,
         (SELECT count(*) FROM url_registry.url_registry_invalidation_outbox
           WHERE command_idempotency_key = ANY($1::text[]))::text AS outbox`,
      [[...idempotencyKeys]]
    )
    const row = counted.rows[0]
    if (!row) {
      throw new Error("PostgreSQL returned no artifact-count row")
    }
    return {
      audits: integer(row.audits, "audit count"),
      commands: integer(row.commands, "command count"),
      outbox: integer(row.outbox, "outbox count"),
    }
  }

  return {
    admin,
    async close() {
      await Promise.all([runtime.end(), admin.end()])
    },
    countArtifacts,
    nextNamespace(prefix = "pg18") {
      namespaceCounter += 1
      return `${prefix}-${String(namespaceCounter).padStart(4, "0")}`
    },
    registry,
    reset,
    runtime,
    sqlPool,
  }
}
