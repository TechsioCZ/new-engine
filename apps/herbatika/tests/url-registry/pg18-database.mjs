import { randomBytes } from "node:crypto"
import { fileURLToPath } from "node:url"
import { Pool } from "pg"
import { loadUrlRegistryMigrationPlan } from "../../scripts/url-registry/migration-files.mjs"
import { runUrlRegistryMigrations } from "../../scripts/url-registry/migration-runner.mjs"

const EXPECTED_SERVER_VERSION = /^18\.1(?:\.|\s|$)/
const SAFE_IDENTIFIER = /^[a-z][a-z0-9_]{0,62}$/

const migrationsDirectory = fileURLToPath(
  new URL("../../src/lib/url-registry/migrations/", import.meta.url)
)

const identifier = (value) => {
  if (!SAFE_IDENTIFIER.test(value)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${value}`)
  }
  return `"${value}"`
}

const literal = (value) => `'${value.replaceAll("'", "''")}'`

const connectionUrl = ({ database, host, password, port, user }) => {
  const url = new URL("postgresql://localhost")
  url.hostname = host
  url.port = String(port)
  url.username = user
  url.password = password
  url.pathname = `/${database}`
  url.searchParams.set("sslmode", "disable")
  return url.toString()
}

export const createDockerCredentialSet = ({ host, port, token }) => {
  const suffix = token.replaceAll("-", "").slice(0, 12).toLowerCase()
  const migrationUser = `urlr_migrator_${suffix}`
  const runtimeUser = `urlr_runtime_${suffix}`
  const database = `urlr_test_${suffix}`
  const migrationPassword = randomBytes(24).toString("hex")
  const runtimePassword = randomBytes(24).toString("hex")
  return {
    database,
    migrationPassword,
    migrationUrl: connectionUrl({
      database,
      host,
      password: migrationPassword,
      port,
      user: migrationUser,
    }),
    migrationUser,
    runtimePassword,
    runtimeUrl: connectionUrl({
      database,
      host,
      password: runtimePassword,
      port,
      user: runtimeUser,
    }),
    runtimeUser,
  }
}

export const bootstrapDedicatedDatabase = async ({
  bootstrapUrl,
  credentials,
}) => {
  const pool = new Pool({ connectionString: bootstrapUrl, max: 1 })
  try {
    await pool.query(
      `CREATE ROLE ${identifier(credentials.migrationUser)} LOGIN PASSWORD ${literal(
        credentials.migrationPassword
      )} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`
    )
    await pool.query(
      `CREATE ROLE ${identifier(credentials.runtimeUser)} LOGIN PASSWORD ${literal(
        credentials.runtimePassword
      )} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`
    )
    await pool.query(
      `CREATE DATABASE ${identifier(credentials.database)} OWNER ${identifier(
        credentials.migrationUser
      )}`
    )
  } finally {
    await pool.end()
  }
}

export const assertPostgres181 = async (connectionString) => {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 2000,
    max: 1,
  })
  try {
    const result = await pool.query(
      "SELECT current_setting('server_version') AS version"
    )
    const version = result.rows[0]?.version
    if (typeof version !== "string" || !EXPECTED_SERVER_VERSION.test(version)) {
      throw new Error(
        `URL registry gate requires PostgreSQL 18.1, received ${String(version)}`
      )
    }
    return version
  } finally {
    await pool.end()
  }
}

export const waitForPostgres = async (
  connectionString,
  { timeoutMs = 45_000, intervalMs = 250 } = {}
) => {
  const deadline = Date.now() + timeoutMs
  let lastError
  while (Date.now() < deadline) {
    try {
      return await assertPostgres181(connectionString)
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
  throw new Error(`PostgreSQL 18.1 was not ready within ${timeoutMs}ms`, {
    cause: lastError,
  })
}

export const migrateUrlRegistry = async (
  migrationUrl,
  { throughVersion } = {}
) => {
  const completePlan = await loadUrlRegistryMigrationPlan({
    migrationsDirectory,
  })
  if (
    throughVersion !== undefined &&
    (!Number.isSafeInteger(throughVersion) ||
      throughVersion <= 0 ||
      throughVersion > completePlan.length)
  ) {
    throw new TypeError(
      "throughVersion must select a contiguous migration prefix"
    )
  }
  const plan =
    throughVersion === undefined
      ? completePlan
      : completePlan.slice(0, throughVersion)
  return runUrlRegistryMigrations({
    pool: new Pool({ connectionString: migrationUrl, max: 1 }),
    plan,
  })
}

export const seedLegacyCatalogUnpublishedReceipt = async (migrationUrl) => {
  const sourceId = "pg18-v4-legacy-category-unpublished"
  const pool = new Pool({ connectionString: migrationUrl, max: 1 })
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query(
      `INSERT INTO url_registry.url_registry_source_event_receipt (
        source_system, source_type, source_id, market, stream_sequence,
        source_event_id, envelope_fingerprint, change_type, action,
        command_idempotency_key
      ) VALUES (
        'medusa', 'category', $1, 'ro', 1, $2, $3,
        'reconcile', 'unpublished', NULL
      )`,
      [sourceId, `${sourceId}:event`, `sha256:${"a".repeat(64)}`]
    )
    await client.query(
      `INSERT INTO url_registry.url_registry_source_event_cursor (
        source_system, source_type, source_id, market, last_sequence
      ) VALUES ('medusa', 'category', $1, 'ro', 1)`,
      [sourceId]
    )
    await client.query("COMMIT")
    return sourceId
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {})
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

export const assertLegacyCatalogUnpublishedReceipt = async (
  migrationUrl,
  sourceId
) => {
  const pool = new Pool({ connectionString: migrationUrl, max: 1 })
  try {
    const result = await pool.query(
      `SELECT action, command_idempotency_key
       FROM url_registry.url_registry_source_event_receipt
       WHERE source_system = 'medusa'
         AND source_type = 'category'
         AND source_id = $1
         AND market = 'ro'`,
      [sourceId]
    )
    if (
      result.rows.length !== 1 ||
      result.rows[0]?.action !== "unpublished" ||
      result.rows[0]?.command_idempotency_key !== null
    ) {
      throw new Error(
        "URL registry migration 0005 did not preserve the legacy catalog receipt"
      )
    }
  } finally {
    await pool.end()
  }
}

const currentUser = async (connectionString) => {
  const pool = new Pool({ connectionString, max: 1 })
  try {
    const result = await pool.query("SELECT current_user AS name")
    const name = result.rows[0]?.name
    if (typeof name !== "string" || !SAFE_IDENTIFIER.test(name)) {
      throw new Error("PostgreSQL returned an unsafe current_user")
    }
    return name
  } finally {
    await pool.end()
  }
}

export const grantRuntimeAccess = async ({ migrationUrl, runtimeUrl }) => {
  const [migrationUser, runtimeUser] = await Promise.all([
    currentUser(migrationUrl),
    currentUser(runtimeUrl),
  ])
  if (migrationUser === runtimeUser) {
    throw new Error("Migration and runtime PostgreSQL users must be distinct")
  }

  const runtime = identifier(runtimeUser)
  const pool = new Pool({ connectionString: migrationUrl, max: 1 })
  try {
    await pool.query(`GRANT USAGE ON SCHEMA url_registry TO ${runtime}`)
    await pool.query(
      `GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA url_registry TO ${runtime}`
    )
    await pool.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA url_registry TO ${runtime}`
    )
    await pool.query(
      `REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA url_registry FROM ${runtime}`
    )
    await pool.query(
      `REVOKE INSERT, UPDATE ON TABLE url_registry.schema_migrations FROM ${runtime}`
    )
    await pool.query(
      `REVOKE UPDATE ON TABLE url_registry.url_registry_source_event_receipt FROM ${runtime}`
    )
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA url_registry GRANT SELECT, INSERT, UPDATE ON TABLES TO ${runtime}`
    )
    await pool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA url_registry GRANT USAGE, SELECT ON SEQUENCES TO ${runtime}`
    )
  } finally {
    await pool.end()
  }
}
