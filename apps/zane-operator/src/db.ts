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

function quoteCatalogIdentifier(identifier: string): string {
  return `"${identifier.replaceAll("\"", "\"\"")}"`
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

export interface FileCopyMethodInspection {
  method: string | null
  cloneOptimized: boolean
  warning: string | null
}

export async function inspectFileCopyMethod(sql: Bun.SQL): Promise<FileCopyMethodInspection> {
  try {
    const rows = await sql<{ file_copy_method: string }[]>`SHOW file_copy_method`
    const method = rows[0]?.file_copy_method?.trim().toLowerCase() || null
    if (method === "clone") {
      return { method, cloneOptimized: true, warning: null }
    }

    return {
      method,
      cloneOptimized: false,
      warning:
        method === null
          ? "file_copy_method is unavailable; preview clone performance can be improved by starting PostgreSQL with -c file_copy_method=clone."
          : `file_copy_method is "${method}"; preview clone performance can be improved by starting PostgreSQL with -c file_copy_method=clone.`,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const normalizedMessage = message.toLowerCase()
    if (normalizedMessage.includes("unrecognized configuration parameter")) {
      return {
        method: null,
        cloneOptimized: false,
        warning:
          "file_copy_method is not recognized on this PostgreSQL server; preview clone performance can be improved by using PostgreSQL 18+ with -c file_copy_method=clone.",
      }
    }

    return {
      method: null,
      cloneOptimized: false,
      warning: `unable to read file_copy_method (${message}); preview clone performance can be improved by starting PostgreSQL with -c file_copy_method=clone.`,
    }
  }
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

async function withDatabaseClientByUrl<T>(
  databaseUrl: string,
  databaseName: string,
  operation: (databaseSql: Bun.SQL) => Promise<T>,
): Promise<T> {
  const databaseSql = new SQL({
    url: buildDatabaseUrl(databaseUrl, databaseName),
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

async function withDatabaseClient<T>(
  config: AppConfig,
  databaseName: string,
  operation: (databaseSql: Bun.SQL) => Promise<T>,
): Promise<T> {
  return await withDatabaseClientByUrl(config.databaseUrl, databaseName, operation)
}

interface DatabaseSchema {
  name: string
}

async function listNonSystemSchemas(databaseSql: Bun.SQL): Promise<string[]> {
  const rows = await databaseSql<DatabaseSchema[]>`
    SELECT nspname AS "name"
    FROM pg_namespace
    WHERE nspname <> 'information_schema'
      AND nspname NOT LIKE 'pg_%'
    ORDER BY nspname ASC
  `

  return rows.map((row) => row.name)
}

async function grantReadWriteOnSchema(
  databaseSql: Bun.SQL,
  schemaName: string,
  roleName: string,
  includeCreate = false,
): Promise<void> {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedRoleName = quoteIdentifier(roleName)

  if (includeCreate) {
    await databaseSql.unsafe(`GRANT USAGE, CREATE ON SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`)
  } else {
    await databaseSql.unsafe(`GRANT USAGE ON SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`)
  }
  await databaseSql.unsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`,
  )
  await databaseSql.unsafe(
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`,
  )
  await databaseSql.unsafe(`GRANT EXECUTE ON ALL ROUTINES IN SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`)
}

interface SchemaOwnerRole {
  owner: string
}

async function listSchemaOwnerRoles(databaseSql: Bun.SQL, schemaName: string): Promise<string[]> {
  const rows = await databaseSql<SchemaOwnerRole[]>`
    SELECT DISTINCT owner
    FROM (
      SELECT pg_get_userbyid(n.nspowner) AS owner
      FROM pg_namespace n
      WHERE n.nspname = ${schemaName}

      UNION

      SELECT pg_get_userbyid(c.relowner) AS owner
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = ${schemaName}
        AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')

      UNION

      SELECT pg_get_userbyid(p.proowner) AS owner
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = ${schemaName}
    ) owners
    WHERE owner IS NOT NULL
      AND owner <> ''
    ORDER BY owner ASC
  `

  return rows.map((row) => row.owner)
}

interface DefaultPrivilegeResult {
  applied: number
  skipped: number
}

async function grantReadWriteDefaultPrivilegesOnSchema(
  databaseSql: Bun.SQL,
  schemaName: string,
  roleName: string,
): Promise<DefaultPrivilegeResult> {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedRoleName = quoteIdentifier(roleName)
  const owners = await listSchemaOwnerRoles(databaseSql, schemaName)

  let applied = 0
  let skipped = 0
  for (const owner of owners) {
    const quotedOwnerName = quoteCatalogIdentifier(owner)

    try {
      await databaseSql.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwnerName} IN SCHEMA ${quotedSchemaName} GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES TO ${quotedRoleName};`,
      )
      await databaseSql.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwnerName} IN SCHEMA ${quotedSchemaName} GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${quotedRoleName};`,
      )
      await databaseSql.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwnerName} IN SCHEMA ${quotedSchemaName} GRANT EXECUTE ON ROUTINES TO ${quotedRoleName};`,
      )
      applied += 1
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      const normalizedMessage = message.toLowerCase()
      if (normalizedMessage.includes("must be member of role") || normalizedMessage.includes("permission denied")) {
        skipped += 1
        continue
      }
      throw error
    }
  }

  return { applied, skipped }
}

async function ensureSchemaExists(databaseSql: Bun.SQL, schemaName: string, ownerRole: string): Promise<void> {
  await databaseSql.unsafe(
    `CREATE SCHEMA IF NOT EXISTS ${quoteCatalogIdentifier(schemaName)} AUTHORIZATION ${quoteIdentifier(ownerRole)};`,
  )
}

async function lockDownPublicSchema(databaseSql: Bun.SQL): Promise<void> {
  await databaseSql.unsafe("REVOKE ALL ON SCHEMA public FROM PUBLIC;")
}

async function setRoleSearchPath(sql: Bun.SQL, roleName: string, databaseName: string, schemaName: string): Promise<void> {
  await sql.unsafe(
    `ALTER ROLE ${quoteIdentifier(roleName)} IN DATABASE ${quoteIdentifier(databaseName)} SET search_path = ${quoteCatalogIdentifier(schemaName)}, pg_catalog;`,
  )
}

async function transferSchemaOwnershipToRole(databaseSql: Bun.SQL, schemaName: string, targetRole: string): Promise<void> {
  await databaseSql.unsafe(
    `
DO $do$
DECLARE
  rel RECORD;
  routine RECORD;
  custom_type RECORD;
BEGIN
  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', ${quoteLiteral(schemaName)}, ${quoteLiteral(targetRole)});

  FOR rel IN
    SELECT c.oid, c.relkind, n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'e'
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
      AND (
        c.relkind <> 'S'
        OR NOT EXISTS (
          SELECT 1
          FROM pg_depend sd
          WHERE sd.classid = 'pg_class'::regclass
            AND sd.objid = c.oid
            AND sd.refclassid = 'pg_class'::regclass
            AND sd.deptype IN ('a', 'i')
        )
      )
      AND d.objid IS NULL
  LOOP
    IF rel.relkind IN ('r', 'p', 'f') THEN
      EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    ELSIF rel.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    ELSIF rel.relkind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    ELSIF rel.relkind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    END IF;
  END LOOP;

  FOR routine IN
    SELECT p.oid::regprocedure AS identity
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND d.objid IS NULL
  LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO %I', routine.identity, ${quoteLiteral(targetRole)});
  END LOOP;

  FOR custom_type IN
    SELECT format('%I.%I', n.nspname, t.typname) AS identity
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_depend d ON d.objid = t.oid AND d.deptype = 'e'
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND t.typtype IN ('d', 'e')
      AND d.objid IS NULL
  LOOP
    EXECUTE format('ALTER TYPE %s OWNER TO %I', custom_type.identity, ${quoteLiteral(targetRole)});
  END LOOP;
END
$do$;
`,
  )
}

async function grantAppRoleOnSchema(databaseSql: Bun.SQL, schemaName: string, appRoleName: string): Promise<void> {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedAppRoleName = quoteIdentifier(appRoleName)

  await databaseSql.unsafe(`GRANT USAGE, CREATE ON SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`)
  await databaseSql.unsafe(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`)
  await databaseSql.unsafe(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`)
  await databaseSql.unsafe(`GRANT EXECUTE ON ALL ROUTINES IN SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`)
}

async function transferOwnedObjectsInSchemaToRole(
  databaseSql: Bun.SQL,
  schemaName: string,
  sourceRole: string,
  targetRole: string,
): Promise<void> {
  await databaseSql.unsafe(
    `
DO $do$
DECLARE
  rel RECORD;
  routine RECORD;
  custom_type RECORD;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_namespace n
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND pg_get_userbyid(n.nspowner) = ${quoteLiteral(sourceRole)}
  ) THEN
    EXECUTE format('ALTER SCHEMA %I OWNER TO %I', ${quoteLiteral(schemaName)}, ${quoteLiteral(targetRole)});
  END IF;

  FOR rel IN
    SELECT c.oid, c.relkind, n.nspname, c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_depend d ON d.objid = c.oid AND d.deptype = 'e'
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
      AND (
        c.relkind <> 'S'
        OR NOT EXISTS (
          SELECT 1
          FROM pg_depend sd
          WHERE sd.classid = 'pg_class'::regclass
            AND sd.objid = c.oid
            AND sd.refclassid = 'pg_class'::regclass
            AND sd.deptype IN ('a', 'i')
        )
      )
      AND d.objid IS NULL
      AND pg_get_userbyid(c.relowner) = ${quoteLiteral(sourceRole)}
  LOOP
    IF rel.relkind IN ('r', 'p', 'f') THEN
      EXECUTE format('ALTER TABLE %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    ELSIF rel.relkind = 'v' THEN
      EXECUTE format('ALTER VIEW %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    ELSIF rel.relkind = 'm' THEN
      EXECUTE format('ALTER MATERIALIZED VIEW %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    ELSIF rel.relkind = 'S' THEN
      EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO %I', rel.nspname, rel.relname, ${quoteLiteral(targetRole)});
    END IF;
  END LOOP;

  FOR routine IN
    SELECT p.oid::regprocedure AS identity
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND d.objid IS NULL
      AND pg_get_userbyid(p.proowner) = ${quoteLiteral(sourceRole)}
  LOOP
    EXECUTE format('ALTER ROUTINE %s OWNER TO %I', routine.identity, ${quoteLiteral(targetRole)});
  END LOOP;

  FOR custom_type IN
    SELECT format('%I.%I', n.nspname, t.typname) AS identity
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    LEFT JOIN pg_depend d ON d.objid = t.oid AND d.deptype = 'e'
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND t.typtype IN ('d', 'e')
      AND d.objid IS NULL
      AND pg_get_userbyid(t.typowner) = ${quoteLiteral(sourceRole)}
  LOOP
    EXECUTE format('ALTER TYPE %s OWNER TO %I', custom_type.identity, ${quoteLiteral(targetRole)});
  END LOOP;
END
$do$;
`,
  )
}

async function revokeDefaultPrivilegesOnSchema(
  databaseSql: Bun.SQL,
  schemaName: string,
  targetRole: string,
): Promise<void> {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedTargetRole = quoteIdentifier(targetRole)
  const owners = await listSchemaOwnerRoles(databaseSql, schemaName)

  for (const owner of owners) {
    const quotedOwnerName = quoteCatalogIdentifier(owner)
    try {
      await databaseSql.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwnerName} IN SCHEMA ${quotedSchemaName} REVOKE ALL PRIVILEGES ON TABLES FROM ${quotedTargetRole};`,
      )
      await databaseSql.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwnerName} IN SCHEMA ${quotedSchemaName} REVOKE ALL PRIVILEGES ON SEQUENCES FROM ${quotedTargetRole};`,
      )
      await databaseSql.unsafe(
        `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedOwnerName} IN SCHEMA ${quotedSchemaName} REVOKE ALL PRIVILEGES ON ROUTINES FROM ${quotedTargetRole};`,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      const normalizedMessage = message.toLowerCase()
      if (normalizedMessage.includes("must be member of role") || normalizedMessage.includes("permission denied")) {
        continue
      }
      throw error
    }
  }
}

async function revokeAppRoleOutsideSchema(
  databaseSql: Bun.SQL,
  appRoleName: string,
  fallbackOwnerRole: string,
  allowedSchemaName: string,
): Promise<void> {
  const schemas = await listNonSystemSchemas(databaseSql)
  for (const schemaName of schemas) {
    if (schemaName === allowedSchemaName) {
      continue
    }

    await transferOwnedObjectsInSchemaToRole(databaseSql, schemaName, appRoleName, fallbackOwnerRole)
    await revokeDefaultPrivilegesOnSchema(databaseSql, schemaName, appRoleName)

    const quotedSchemaName = quoteCatalogIdentifier(schemaName)
    const quotedAppRoleName = quoteIdentifier(appRoleName)

    await databaseSql.unsafe(`REVOKE ALL PRIVILEGES ON SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`)
    await databaseSql.unsafe(`REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`)
    await databaseSql.unsafe(
      `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`,
    )
    await databaseSql.unsafe(`REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`)
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
    await sql.unsafe(
      `GRANT ${quoteIdentifier(appRoleName)} TO ${quoteIdentifier(previewOwner)} WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;`,
    )
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

  await sql.unsafe(`REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdentifier(dbName)} FROM ${quoteIdentifier(appRoleName)};`)
  await sql.unsafe(
    `REVOKE CREATE, TEMPORARY ON DATABASE ${quoteIdentifier(dbName)} FROM ${quoteIdentifier(appRoleName)};`,
  )
  await sql.unsafe(`REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteIdentifier(dbName)} FROM PUBLIC;`)
  await sql.unsafe(`GRANT CONNECT ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(appRoleName)};`)
  await sql.unsafe(`GRANT CONNECT ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(devRole)};`)
  await setRoleSearchPath(sql, appRoleName, dbName, config.appSchema)

  await withDatabaseClient(config, dbName, async (dbSql) => {
    await lockDownPublicSchema(dbSql)
    await ensureSchemaExists(dbSql, config.appSchema, appRoleName)
    await transferSchemaOwnershipToRole(dbSql, config.appSchema, appRoleName)
    await grantAppRoleOnSchema(dbSql, config.appSchema, appRoleName)
    await revokeAppRoleOutsideSchema(dbSql, appRoleName, config.previewOwner, config.appSchema)

    const schemas = await listNonSystemSchemas(dbSql)
    for (const schemaName of schemas) {
      await grantReadWriteOnSchema(dbSql, schemaName, devRole, true)
      await grantReadWriteDefaultPrivilegesOnSchema(dbSql, schemaName, devRole)
    }

    const quotedSchemaName = quoteCatalogIdentifier(config.appSchema)
    const quotedAppRoleName = quoteIdentifier(appRoleName)
    const quotedDevRoleName = quoteIdentifier(devRole)
    await dbSql.unsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedAppRoleName} IN SCHEMA ${quotedSchemaName} GRANT ALL PRIVILEGES ON TABLES TO ${quotedAppRoleName}, ${quotedDevRoleName};`,
    )
    await dbSql.unsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedAppRoleName} IN SCHEMA ${quotedSchemaName} GRANT ALL PRIVILEGES ON SEQUENCES TO ${quotedAppRoleName}, ${quotedDevRoleName};`,
    )
    await dbSql.unsafe(
      `ALTER DEFAULT PRIVILEGES FOR ROLE ${quotedAppRoleName} IN SCHEMA ${quotedSchemaName} GRANT EXECUTE ON ROUTINES TO ${quotedAppRoleName}, ${quotedDevRoleName};`,
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
        `CREATE DATABASE ${quoteIdentifier(dbName)} WITH TEMPLATE ${quoteIdentifier(templateDatabase)} OWNER ${quoteIdentifier(owner)} STRATEGY = FILE_COPY;`,
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

interface ActiveConnectionByRole {
  role: string
  activeConnections: number
}

function sanitizeRoleName(roleName: string): string {
  const normalized = roleName.trim() || "unknown"
  return normalized.replaceAll(/[^A-Za-z0-9_:@.-]/g, "?").slice(0, 63)
}

function formatActiveConnectionsByRole(rows: ActiveConnectionByRole[]): string {
  if (rows.length === 0) {
    return "none"
  }

  return rows.map((entry) => `${sanitizeRoleName(entry.role)}(${entry.activeConnections})`).join(", ")
}

async function getActiveConnectionsByRole(sql: Bun.SQL, databaseName: string): Promise<ActiveConnectionByRole[]> {
  const rows = await sql<{ role: string | null; active_connections: number }[]>`
    SELECT COALESCE(usename, 'unknown') AS "role",
           COUNT(*)::int AS "active_connections"
    FROM pg_stat_activity
    WHERE datname = ${databaseName}
      AND pid <> pg_backend_pid()
    GROUP BY usename
    ORDER BY COUNT(*) DESC, COALESCE(usename, 'unknown') ASC
  `

  return rows.map((row) => ({
    role: row.role ?? "unknown",
    activeConnections: row.active_connections,
  }))
}

async function getActiveConnectionSummary(sql: Bun.SQL, databaseName: string): Promise<string> {
  try {
    const rows = await getActiveConnectionsByRole(sql, databaseName)
    return formatActiveConnectionsByRole(rows)
  } catch {
    return "unavailable"
  }
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
      const roleSummary = await getActiveConnectionSummary(sql, databaseName)
      throw new BadRequestError(
        `database role cannot terminate active sessions required for DROP DATABASE ... WITH (FORCE). Grant pg_signal_backend to the operator role (e.g. GRANT pg_signal_backend TO zane_operator). Active connections by role: ${roleSummary}.`,
      )
    }

    if (normalizedMessage.includes("is being accessed by other users")) {
      const roleSummary = await getActiveConnectionSummary(sql, databaseName)
      throw new BadRequestError(
        `database still has active connections and could not be dropped. Ensure teardown role can terminate backends for the target preview database. Active connections by role: ${roleSummary}.`,
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

interface NonTemplateDatabase {
  name: string
}

async function listNonTemplateDatabases(sql: Bun.SQL): Promise<string[]> {
  const rows = await sql<NonTemplateDatabase[]>`
    SELECT datname AS "name"
    FROM pg_database
    WHERE datistemplate = false
    ORDER BY datname ASC
  `

  return rows.map((row) => row.name)
}

async function revokeBroadDatabaseConnectGrants(sql: Bun.SQL, roleName: string): Promise<number> {
  const databases = await listNonTemplateDatabases(sql)
  let revoked = 0

  for (const databaseName of databases) {
    await sql.unsafe(
      `REVOKE CONNECT, TEMPORARY, CREATE ON DATABASE ${quoteCatalogIdentifier(databaseName)} FROM ${quoteIdentifier(roleName)};`,
    )
    revoked += 1
  }

  return revoked
}

export interface CreateOrUpdateDevRoleParams {
  username: string
  password: string
  databaseUrl: string
  grantConnectToAllDatabases: boolean
}

export interface CreateOrUpdateDevRoleResult {
  username: string
  created: boolean
  connectGrantsApplied: number
  connectGrantsRevoked: number
  schemaGrantsApplied: number
  defaultPrivilegeOwnersApplied: number
  defaultPrivilegeOwnersSkipped: number
}

export async function createOrUpdateDevRole(
  sql: Bun.SQL,
  params: CreateOrUpdateDevRoleParams,
): Promise<CreateOrUpdateDevRoleResult> {
  const username = normalizeIdentifier(params.username, "username")
  if (!params.password) {
    throw new BadRequestError("password cannot be empty")
  }

  const exists = await roleExists(sql, username)
  if (!exists) {
    await sql.unsafe(`CREATE ROLE ${quoteIdentifier(username)} LOGIN;`)
  }

  await sql.unsafe(
    `ALTER ROLE ${quoteIdentifier(username)} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS INHERIT PASSWORD ${quoteLiteral(params.password)};`,
  )

  let connectGrantsApplied = 0
  let connectGrantsRevoked = 0
  let schemaGrantsApplied = 0
  let defaultPrivilegeOwnersApplied = 0
  let defaultPrivilegeOwnersSkipped = 0
  if (params.grantConnectToAllDatabases) {
    const databases = await listNonTemplateDatabases(sql)
    for (const databaseName of databases) {
      await sql.unsafe(
        `GRANT CONNECT ON DATABASE ${quoteCatalogIdentifier(databaseName)} TO ${quoteIdentifier(username)};`,
      )
      connectGrantsApplied += 1

      await withDatabaseClientByUrl(params.databaseUrl, databaseName, async (databaseSql) => {
        const schemas = await listNonSystemSchemas(databaseSql)
        for (const schemaName of schemas) {
          await grantReadWriteOnSchema(databaseSql, schemaName, username, true)
          schemaGrantsApplied += 1

          const defaultPrivilegeResult = await grantReadWriteDefaultPrivilegesOnSchema(databaseSql, schemaName, username)
          defaultPrivilegeOwnersApplied += defaultPrivilegeResult.applied
          defaultPrivilegeOwnersSkipped += defaultPrivilegeResult.skipped
        }
      })
    }
  } else {
    connectGrantsRevoked = await revokeBroadDatabaseConnectGrants(sql, username)
  }

  return {
    username,
    created: !exists,
    connectGrantsApplied,
    connectGrantsRevoked,
    schemaGrantsApplied,
    defaultPrivilegeOwnersApplied,
    defaultPrivilegeOwnersSkipped,
  }
}

export interface TeardownPreviewDatabaseResult {
  dbName: string
  deleted: boolean
  terminatedConnections: number
  appUser: string
  roleDeleted: boolean
  devGrantsCleaned: boolean
  noop: boolean
  noopReason: "database_not_found" | null
}

export async function teardownPreviewDatabase(
  sql: Bun.SQL,
  config: AppConfig,
  prNumber: number,
): Promise<TeardownPreviewDatabaseResult> {
  const dbName = buildPreviewDatabaseName(config.previewPrefix, prNumber)
  const appUser = buildPreviewAppRoleName(config.previewAppUserPrefix, prNumber)
  assertSafeTargetDatabaseName(dbName, config)

  return await withAdvisoryLock(sql, dbName, async (lockedSql) => {
    const exists = await databaseExists(lockedSql, dbName)
    let deleted = false
    let terminatedConnections = 0

    if (exists) {
      terminatedConnections = await countActiveDatabaseConnections(lockedSql, dbName)
      await dropDatabase(lockedSql, dbName)
      deleted = true
    }

    const roleDeleted = await dropPreviewAppRole(lockedSql, appUser)

    return {
      dbName,
      deleted,
      terminatedConnections,
      appUser,
      roleDeleted,
      devGrantsCleaned: deleted,
      noop: !exists,
      noopReason: exists ? null : "database_not_found",
    }
  })
}
