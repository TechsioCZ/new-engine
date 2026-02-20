import { createHmac } from "node:crypto"
import { SQL } from "bun"

import type { AppConfig } from "./config"

const IDENTIFIER_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
const MAX_IDENTIFIER_LENGTH = 63

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BadRequestError"
  }
}

function assertSafeIdentifier(value: string, label: string): void {
  if (!IDENTIFIER_REGEX.test(value)) {
    throw new BadRequestError(`${label} must match ${IDENTIFIER_REGEX.source}`)
  }

  if (value.length > MAX_IDENTIFIER_LENGTH) {
    throw new BadRequestError(`${label} must be at most ${MAX_IDENTIFIER_LENGTH} characters`)
  }
}

function quoteIdentifier(identifier: string): string {
  assertSafeIdentifier(identifier, "identifier")
  return `"${identifier}"`
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export function parsePrNumber(value: unknown, label = "pr_number"): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number.parseInt(value, 10)
        : Number.NaN

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new BadRequestError(`${label} must be a positive integer`)
  }

  return parsed
}

function normalizeIdentifier(value: string, label: string): string {
  const normalized = value.trim()

  if (!normalized) {
    throw new BadRequestError(`${label} cannot be empty`)
  }

  assertSafeIdentifier(normalized, label)
  return normalized
}

export function createDbClient(config: AppConfig): Bun.SQL {
  return new SQL({
    url: config.databaseUrl,
    max: 10,
    idleTimeout: 15,
    connectionTimeout: 10,
  })
}

function buildPreviewDatabaseName(previewPrefix: string, prNumber: number): string {
  const dbName = `${previewPrefix}${prNumber}`
  assertSafeIdentifier(dbName, "derived database name")
  return dbName
}

function buildPreviewAppRoleName(previewAppUserPrefix: string, prNumber: number): string {
  const roleName = `${previewAppUserPrefix}${prNumber}`
  assertSafeIdentifier(roleName, "derived app role name")
  return roleName
}

function derivePreviewAppPassword(secret: string, dbName: string, roleName: string): string {
  const digest = createHmac("sha256", secret).update(`${dbName}:${roleName}`).digest("base64url")
  return `za_${digest.slice(0, 48)}`
}

function assertSafeTargetDatabaseName(dbName: string, config: AppConfig): void {
  if (!dbName.startsWith(config.previewPrefix)) {
    throw new BadRequestError("refusing operation outside preview database prefix")
  }

  if (config.protectedDbNames.has(dbName.toLowerCase())) {
    throw new BadRequestError("refusing operation on protected database name")
  }
}

async function databaseExists(sql: Bun.SQL, databaseName: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(
      SELECT 1
      FROM pg_database
      WHERE datname = ${databaseName}
    ) AS "exists"
  `

  return rows[0]?.exists === true
}

async function roleExists(sql: Bun.SQL, roleName: string): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    SELECT EXISTS(
      SELECT 1
      FROM pg_roles
      WHERE rolname = ${roleName}
    ) AS "exists"
  `

  return rows[0]?.exists === true
}

function buildDatabaseUrl(databaseUrl: string, databaseName: string): string {
  const parsedUrl = new URL(databaseUrl)
  parsedUrl.pathname = `/${databaseName}`
  return parsedUrl.toString()
}

async function withDatabaseClient<T>(
  config: AppConfig,
  databaseName: string,
  operation: (databaseSql: Bun.SQL) => Promise<T>,
): Promise<T> {
  const databaseSql = new SQL({
    url: buildDatabaseUrl(config.databaseUrl, databaseName),
    max: 4,
    idleTimeout: 10,
    connectionTimeout: 10,
  })

  try {
    await databaseSql.connect()
    return await operation(databaseSql)
  } finally {
    await databaseSql.close({ timeout: 5 })
  }
}

async function withAdvisoryLock<T>(
  sql: Bun.SQL,
  lockKey: string,
  operation: (lockedSql: Bun.ReservedSQL) => Promise<T>,
): Promise<T> {
  const reservedSql = await sql.reserve()
  let lockAcquired = false

  try {
    await reservedSql`SELECT pg_advisory_lock(hashtext(${lockKey}))`
    lockAcquired = true
    return await operation(reservedSql)
  } finally {
    try {
      if (lockAcquired) {
        await reservedSql`SELECT pg_advisory_unlock(hashtext(${lockKey}))`
      }
    } finally {
      reservedSql.release()
    }
  }
}

async function ensurePreviewAppRole(
  sql: Bun.SQL,
  previewOwner: string,
  appRoleName: string,
  appPassword: string,
): Promise<void> {
  const exists = await roleExists(sql, appRoleName)
  if (!exists) {
    await sql.unsafe(`CREATE ROLE ${quoteIdentifier(appRoleName)} LOGIN;`)
  }

  await sql.unsafe(
    `ALTER ROLE ${quoteIdentifier(appRoleName)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD ${quoteLiteral(appPassword)};`,
  )

  // Allow preview owner to manage default privileges for app role objects.
  if (previewOwner !== appRoleName) {
    await sql.unsafe(`GRANT ${quoteIdentifier(appRoleName)} TO ${quoteIdentifier(previewOwner)};`)
  }
}

async function syncPreviewDatabaseGrants(
  sql: Bun.SQL,
  config: AppConfig,
  dbName: string,
  appRoleName: string,
): Promise<void> {
  if (!(await roleExists(sql, config.previewOwner))) {
    throw new BadRequestError(`configured preview owner role "${config.previewOwner}" does not exist`)
  }

  const devRole = config.previewDevRole

  if (!(await roleExists(sql, devRole))) {
    throw new BadRequestError(`configured dev role "${devRole}" does not exist`)
  }

  await sql.unsafe(`GRANT CONNECT, TEMP ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(appRoleName)};`)
  await sql.unsafe(`GRANT CONNECT, TEMP ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(devRole)};`)

  await withDatabaseClient(config, dbName, async (dbSql) => {
    await dbSql.unsafe(`GRANT USAGE, CREATE ON SCHEMA public TO ${quoteIdentifier(appRoleName)};`)
    await dbSql.unsafe(`GRANT USAGE, CREATE ON SCHEMA public TO ${quoteIdentifier(devRole)};`)

    await dbSql.unsafe(
      `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${quoteIdentifier(appRoleName)}, ${quoteIdentifier(devRole)};`,
    )
    await dbSql.unsafe(
      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdentifier(appRoleName)}, ${quoteIdentifier(devRole)};`,
    )
    await dbSql.unsafe(
      `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO ${quoteIdentifier(appRoleName)}, ${quoteIdentifier(devRole)};`,
    )

    // Ensure template-cloned objects owned by the executing role become writable for the preview app role.
    await dbSql.unsafe(`REASSIGN OWNED BY CURRENT_USER TO ${quoteIdentifier(appRoleName)};`)
    await dbSql.unsafe(`ALTER SCHEMA public OWNER TO ${quoteIdentifier(appRoleName)};`)

    await dbSql.unsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(appRoleName)} IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${quoteIdentifier(appRoleName)}, ${quoteIdentifier(devRole)};`,
    )
    await dbSql.unsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(appRoleName)} IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${quoteIdentifier(appRoleName)}, ${quoteIdentifier(devRole)};`,
    )
    await dbSql.unsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quoteIdentifier(appRoleName)} IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO ${quoteIdentifier(appRoleName)}, ${quoteIdentifier(devRole)};`,
    )
  })
}

interface EnsurePreviewDatabaseParams {
  prNumber: number
  templateDatabase: string
  owner: string
}

export async function ensurePreviewDatabase(
  sql: Bun.SQL,
  config: AppConfig,
  params: EnsurePreviewDatabaseParams,
): Promise<{ dbName: string; created: boolean; appUser: string; appPassword: string }> {
  const dbName = buildPreviewDatabaseName(config.previewPrefix, params.prNumber)
  const templateDatabase = normalizeIdentifier(params.templateDatabase, "template_db")
  const owner = normalizeIdentifier(params.owner, "owner")
  const appUser = buildPreviewAppRoleName(config.previewAppUserPrefix, params.prNumber)
  const appPassword = derivePreviewAppPassword(config.previewAppPasswordSecret, dbName, appUser)

  assertSafeTargetDatabaseName(dbName, config)

  return await withAdvisoryLock(sql, dbName, async (lockedSql) => {
    await ensurePreviewAppRole(lockedSql, config.previewOwner, appUser, appPassword)

    const alreadyExists = await databaseExists(lockedSql, dbName)
    if (!alreadyExists) {
      const templateExists = await databaseExists(lockedSql, templateDatabase)
      if (!templateExists) {
        throw new BadRequestError(`template database "${templateDatabase}" does not exist`)
      }

      await lockedSql.unsafe(
        `CREATE DATABASE ${quoteIdentifier(dbName)} WITH TEMPLATE ${quoteIdentifier(templateDatabase)} OWNER ${quoteIdentifier(owner)};`,
      )
    }

    await syncPreviewDatabaseGrants(lockedSql, config, dbName, appUser)

    return { dbName, created: !alreadyExists, appUser, appPassword }
  })
}

async function countActiveDatabaseConnections(sql: Bun.SQL, databaseName: string): Promise<number> {
  const rows = await sql<{ active_connections: number }[]>`
    SELECT COUNT(*)::int AS "active_connections"
    FROM pg_stat_activity
    WHERE datname = ${databaseName}
      AND pid <> pg_backend_pid()
  `

  return rows[0]?.active_connections ?? 0
}

async function dropDatabase(sql: Bun.SQL, databaseName: string): Promise<void> {
  const quotedDbName = quoteIdentifier(databaseName)

  try {
    await sql.unsafe(`DROP DATABASE IF EXISTS ${quotedDbName} WITH (FORCE);`)
    return
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const normalizedMessage = message.toLowerCase()

    if (normalizedMessage.includes("syntax error at or near \"with\"")) {
      await sql.unsafe(`DROP DATABASE IF EXISTS ${quotedDbName};`)
      return
    }

    if (normalizedMessage.includes("permission denied to terminate process")) {
      throw new BadRequestError(
        "database role cannot terminate active sessions required for DROP DATABASE ... WITH (FORCE). Grant pg_signal_backend to the operator role (e.g. GRANT pg_signal_backend TO zane_operator).",
      )
    }

    if (normalizedMessage.includes("is being accessed by other users")) {
      throw new BadRequestError(
        "database still has active connections and could not be dropped. Ensure teardown role can terminate backends for the target preview database.",
      )
    }

    throw error
  }
}

async function dropPreviewAppRole(sql: Bun.SQL, roleName: string): Promise<boolean> {
  if (!(await roleExists(sql, roleName))) {
    return false
  }

  try {
    await sql.unsafe(`DROP ROLE IF EXISTS ${quoteIdentifier(roleName)};`)
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const normalizedMessage = message.toLowerCase()

    if (normalizedMessage.includes("cannot be dropped because some objects depend on it")) {
      throw new BadRequestError(`preview app role "${roleName}" still owns objects and cannot be dropped`)
    }

    throw error
  }
}

export async function teardownPreviewDatabase(
  sql: Bun.SQL,
  config: AppConfig,
  prNumber: number,
): Promise<{ dbName: string; deleted: boolean; terminatedConnections: number; appUser: string; roleDeleted: boolean }> {
  const dbName = buildPreviewDatabaseName(config.previewPrefix, prNumber)
  const appUser = buildPreviewAppRoleName(config.previewAppUserPrefix, prNumber)
  assertSafeTargetDatabaseName(dbName, config)

  return await withAdvisoryLock(sql, dbName, async (lockedSql) => {
    let deleted = false
    let terminatedConnections = 0

    if (await databaseExists(lockedSql, dbName)) {
      terminatedConnections = await countActiveDatabaseConnections(lockedSql, dbName)
      await dropDatabase(lockedSql, dbName)
      deleted = true
    }

    const roleDeleted = await dropPreviewAppRole(lockedSql, appUser)

    return { dbName, deleted, terminatedConnections, appUser, roleDeleted }
  })
}
