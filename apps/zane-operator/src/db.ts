import { createHmac } from "node:crypto"

import { SQL } from "bun"

import type { AppConfig } from "./config"
import {
  assertSafeIdentifier as assertSafeIdentifierBase,
  databaseExists,
  quoteIdentifier as quoteIdentifierBase,
  quoteLiteral,
  roleExists,
} from "./pg-utils"

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BadRequestError"
  }
}

const toBadRequestError = (message: string): Error =>
  new BadRequestError(message)
const DEV_ROLE_DB_GRANT_CONCURRENCY = 4

const assertSafeIdentifier = (value: string, label: string): void => {
  assertSafeIdentifierBase(value, label, toBadRequestError)
}

const quoteIdentifier = (identifier: string): string =>
  quoteIdentifierBase(identifier, "identifier", toBadRequestError)

// Catalog-derived names can include characters outside IDENTIFIER_REGEX.
// Use this only with trusted values read from PostgreSQL catalogs (never raw user/config input).
const quoteCatalogIdentifier = (identifier: string): string =>
  `"${identifier.replaceAll('"', '""')}"`

export const parsePrNumber = (value: unknown, label = "pr_number"): number => {
  let parsed = Number.NaN
  if (typeof value === "number") {
    parsed = value
  } else if (typeof value === "string" && /^\d+$/u.test(value)) {
    parsed = Math.trunc(Number(value))
  }

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new BadRequestError(`${label} must be a positive integer`)
  }

  return parsed
}

const normalizeIdentifier = (value: string, label: string): string => {
  const normalized = value.trim()

  if (!normalized) {
    throw new BadRequestError(`${label} cannot be empty`)
  }

  assertSafeIdentifier(normalized, label)
  return normalized
}

export const createDbClient = (config: AppConfig): Bun.SQL =>
  new SQL({
    connectionTimeout: 10,
    idleTimeout: 15,
    max: 10,
    url: config.databaseUrl,
  })

export interface FileCopyMethodInspection {
  method: string | null
  cloneOptimized: boolean
  warning: string | null
}

export const inspectFileCopyMethod = async (
  sql: Bun.SQL,
): Promise<FileCopyMethodInspection> => {
  try {
    const rows = await sql<
      { file_copy_method: string }[]
    >`SHOW file_copy_method`
    const configuredMethod = rows[0]?.file_copy_method
    const method = configuredMethod?.trim().toLowerCase() ?? null
    if (method === "clone") {
      return { cloneOptimized: true, method, warning: null }
    }

    return {
      cloneOptimized: false,
      method,
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
        cloneOptimized: false,
        method: null,
        warning:
          "file_copy_method is not recognized on this PostgreSQL server; preview clone performance can be improved by using PostgreSQL 18+ with -c file_copy_method=clone.",
      }
    }

    return {
      cloneOptimized: false,
      method: null,
      warning: `unable to read file_copy_method (${message}); preview clone performance can be improved by starting PostgreSQL with -c file_copy_method=clone.`,
    }
  }
}

const buildPreviewDatabaseName = (
  previewPrefix: string,
  prNumber: number,
): string => {
  const dbName = `${previewPrefix}${prNumber}`
  assertSafeIdentifier(dbName, "derived database name")
  return dbName
}

const buildPreviewAppRoleName = (
  previewAppUserPrefix: string,
  prNumber: number,
): string => {
  const roleName = `${previewAppUserPrefix}${prNumber}`
  assertSafeIdentifier(roleName, "derived app role name")
  return roleName
}

const derivePreviewAppPassword = (
  secret: string,
  dbName: string,
  roleName: string,
): string => {
  const digest = createHmac("sha256", secret)
    .update(`${dbName}:${roleName}`)
    .digest("base64url")
  return `za_${digest.slice(0, 48)}`
}

const assertSafeTargetDatabaseName = (
  dbName: string,
  config: AppConfig,
): void => {
  if (!dbName.startsWith(config.previewPrefix)) {
    throw new BadRequestError(
      "refusing operation outside preview database prefix",
    )
  }

  if (config.protectedDbNames.has(dbName.toLowerCase())) {
    throw new BadRequestError("refusing operation on protected database name")
  }
}

const withDatabaseClientByUrl = async <T>(
  databaseUrl: string,
  databaseName: string,
  operation: (databaseSql: Bun.SQL) => Promise<T>,
): Promise<T> => {
  const databaseSql = new SQL({
    connectionTimeout: 10,
    database: databaseName,
    idleTimeout: 10,
    max: 4,
    url: databaseUrl,
  })

  try {
    await databaseSql.connect()
    return await operation(databaseSql)
  } finally {
    await databaseSql.close({ timeout: 5 })
  }
}

const withDatabaseClient = async <T>(
  config: AppConfig,
  databaseName: string,
  operation: (databaseSql: Bun.SQL) => Promise<T>,
): Promise<T> =>
  await withDatabaseClientByUrl(config.databaseUrl, databaseName, operation)

interface DatabaseSchema {
  name: string
}

const listNonSystemSchemas = async (
  databaseSql: Bun.SQL,
): Promise<string[]> => {
  const rows = await databaseSql<DatabaseSchema[]>`
    SELECT nspname AS "name"
    FROM pg_namespace
    WHERE nspname <> 'information_schema'
      AND nspname NOT LIKE 'pg_%'
    ORDER BY nspname ASC
  `

  return rows.map((row) => row.name)
}

const grantReadWriteOnSchema = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  roleName: string,
  includeCreate = false,
): Promise<void> => {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedRoleName = quoteIdentifier(roleName)

  const schemaPrivileges = includeCreate ? "USAGE, CREATE" : "USAGE"
  await databaseSql.unsafe(
    `GRANT ${schemaPrivileges} ON SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`,
  )
  await databaseSql.unsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON ALL TABLES IN SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`,
  )
  await databaseSql.unsafe(
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`,
  )
  await databaseSql.unsafe(
    `GRANT EXECUTE ON ALL ROUTINES IN SCHEMA ${quotedSchemaName} TO ${quotedRoleName};`,
  )
}

interface SchemaOwnerRole {
  owner: string
}

const getSchemaOwnerRole = async (
  databaseSql: Bun.SQL,
  schemaName: string,
): Promise<string | null> => {
  const rows = await databaseSql<SchemaOwnerRole[]>`
    SELECT pg_get_userbyid(n.nspowner) AS owner
    FROM pg_namespace n
    WHERE n.nspname = ${schemaName}
    LIMIT 1
  `

  return rows[0]?.owner ?? null
}

const listSchemaOwnerRoles = async (
  databaseSql: Bun.SQL,
  schemaName: string,
): Promise<string[]> => {
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

const mapWithConcurrency = async <T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> => {
  if (items.length === 0) {
    return []
  }

  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length))
  const results = Array.from<R>({ length: items.length })
  let nextIndex = 0

  const runWorker = async (): Promise<void> => {
    const index = nextIndex
    nextIndex += 1
    if (index >= items.length) {
      return
    }

    const item = items[index]
    if (item === undefined) {
      throw new Error(`missing concurrency item at index ${index}`)
    }

    results[index] = await worker(item, index)
    await runWorker()
  }

  await Promise.all(
    Array.from({ length: safeConcurrency }, async () => {
      await runWorker()
    }),
  )
  return results
}

interface DefaultPrivilegeResult {
  applied: number
  skipped: number
}

const grantReadWriteDefaultPrivilegesOnSchema = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  roleName: string,
): Promise<DefaultPrivilegeResult> => {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedRoleName = quoteIdentifier(roleName)
  const owners = await listSchemaOwnerRoles(databaseSql, schemaName)

  const ownerResults = await mapWithConcurrency(
    owners,
    1,
    async (owner): Promise<"applied" | "skipped"> => {
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
        return "applied"
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        const normalizedMessage = message.toLowerCase()
        if (
          normalizedMessage.includes("must be member of role") ||
          normalizedMessage.includes("permission denied")
        ) {
          return "skipped"
        }
        throw error
      }
    },
  )

  return {
    applied: ownerResults.filter((result) => result === "applied").length,
    skipped: ownerResults.filter((result) => result === "skipped").length,
  }
}

const ensureSchemaExists = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  ownerRole: string,
): Promise<void> => {
  await databaseSql.unsafe(
    `CREATE SCHEMA IF NOT EXISTS ${quoteCatalogIdentifier(schemaName)} AUTHORIZATION ${quoteIdentifier(ownerRole)};`,
  )
}

const lockDownPublicSchema = async (databaseSql: Bun.SQL): Promise<void> => {
  await databaseSql.unsafe("REVOKE ALL ON SCHEMA public FROM PUBLIC;")
}

const setRoleSearchPath = async (
  sql: Bun.SQL,
  roleName: string,
  databaseName: string,
  schemaName: string,
): Promise<void> => {
  await sql.unsafe(
    `ALTER ROLE ${quoteIdentifier(roleName)} IN DATABASE ${quoteIdentifier(databaseName)} SET search_path = ${quoteCatalogIdentifier(schemaName)}, pg_catalog;`,
  )
}

const transferObjectsOwnership = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  targetRole: string,
  sourceRole?: string,
): Promise<void> => {
  const schemaOwnerBlock =
    sourceRole === undefined
      ? `
  EXECUTE format('ALTER SCHEMA %I OWNER TO %I', ${quoteLiteral(schemaName)}, ${quoteLiteral(targetRole)});
`
      : `
  IF EXISTS (
    SELECT 1
    FROM pg_namespace n
    WHERE n.nspname = ${quoteLiteral(schemaName)}
      AND pg_get_userbyid(n.nspowner) = ${quoteLiteral(sourceRole)}
  ) THEN
    EXECUTE format('ALTER SCHEMA %I OWNER TO %I', ${quoteLiteral(schemaName)}, ${quoteLiteral(targetRole)});
  END IF;
`
  const relationOwnerFilter =
    sourceRole === undefined
      ? ""
      : `\n      AND pg_get_userbyid(c.relowner) = ${quoteLiteral(sourceRole)}`
  const routineOwnerFilter =
    sourceRole === undefined
      ? ""
      : `\n      AND pg_get_userbyid(p.proowner) = ${quoteLiteral(sourceRole)}`
  const typeOwnerFilter =
    sourceRole === undefined
      ? ""
      : `\n      AND pg_get_userbyid(t.typowner) = ${quoteLiteral(sourceRole)}`

  await databaseSql.unsafe(
    `
DO $do$
DECLARE
  rel RECORD;
  routine RECORD;
  custom_type RECORD;
BEGIN
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
      AND d.objid IS NULL${relationOwnerFilter}
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
      AND d.objid IS NULL${routineOwnerFilter}
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
      AND d.objid IS NULL${typeOwnerFilter}
  LOOP
    EXECUTE format('ALTER TYPE %s OWNER TO %I', custom_type.identity, ${quoteLiteral(targetRole)});
  END LOOP;
${schemaOwnerBlock}
END
$do$;
`,
  )
}

const grantAppRoleOnSchema = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  appRoleName: string,
): Promise<void> => {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedAppRoleName = quoteIdentifier(appRoleName)

  await databaseSql.unsafe(
    `GRANT USAGE, CREATE ON SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`,
  )
  await databaseSql.unsafe(
    `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`,
  )
  await databaseSql.unsafe(
    `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`,
  )
  await databaseSql.unsafe(
    `GRANT EXECUTE ON ALL ROUTINES IN SCHEMA ${quotedSchemaName} TO ${quotedAppRoleName};`,
  )
}

const withRole = async <T>(
  databaseSql: Bun.SQL,
  roleName: string,
  operation: (roleSql: Bun.ReservedSQL) => Promise<T>,
): Promise<T> => {
  const reservedSql = await databaseSql.reserve()
  const quotedRoleName = quoteIdentifier(roleName)

  try {
    await reservedSql.unsafe(`SET ROLE ${quotedRoleName};`)
    return await operation(reservedSql)
  } finally {
    try {
      await reservedSql.unsafe("RESET ROLE;")
    } finally {
      reservedSql.release()
    }
  }
}

const grantAppRoleDefaultPrivilegesOnSchemaWithCurrentRole = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  appRoleName: string,
  devRoleName: string,
): Promise<void> => {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedAppRoleName = quoteIdentifier(appRoleName)
  const quotedDevRoleName = quoteIdentifier(devRoleName)

  await databaseSql.unsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchemaName} GRANT ALL PRIVILEGES ON TABLES TO ${quotedAppRoleName}, ${quotedDevRoleName};`,
  )
  await databaseSql.unsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchemaName} GRANT ALL PRIVILEGES ON SEQUENCES TO ${quotedAppRoleName}, ${quotedDevRoleName};`,
  )
  await databaseSql.unsafe(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA ${quotedSchemaName} GRANT EXECUTE ON ROUTINES TO ${quotedAppRoleName}, ${quotedDevRoleName};`,
  )
}

const syncAppSchemaGrants = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  appRoleName: string,
  devRoleName: string,
): Promise<void> => {
  await withRole(databaseSql, appRoleName, async (roleSql) => {
    await grantAppRoleOnSchema(roleSql, schemaName, appRoleName)
    await grantReadWriteOnSchema(roleSql, schemaName, devRoleName, true)
    await grantReadWriteDefaultPrivilegesOnSchema(
      roleSql,
      schemaName,
      devRoleName,
    )
    await grantAppRoleDefaultPrivilegesOnSchemaWithCurrentRole(
      roleSql,
      schemaName,
      appRoleName,
      devRoleName,
    )
  })
}

const transferOwnedObjectsInSchemaToRole = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  sourceRole: string,
  targetRole: string,
): Promise<void> => {
  await transferObjectsOwnership(
    databaseSql,
    schemaName,
    targetRole,
    sourceRole,
  )
}

const revokeDefaultPrivilegesOnSchema = async (
  databaseSql: Bun.SQL,
  schemaName: string,
  targetRole: string,
): Promise<void> => {
  const quotedSchemaName = quoteCatalogIdentifier(schemaName)
  const quotedTargetRole = quoteIdentifier(targetRole)
  const owners = await listSchemaOwnerRoles(databaseSql, schemaName)

  await mapWithConcurrency(owners, 1, async (owner) => {
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
      if (
        normalizedMessage.includes("must be member of role") ||
        normalizedMessage.includes("permission denied")
      ) {
        return
      }
      throw error
    }
  })
}

const revokeAppRoleOutsideSchema = async (
  databaseSql: Bun.SQL,
  appRoleName: string,
  fallbackOwnerRole: string,
  allowedSchemaName: string,
): Promise<void> => {
  const schemas = await listNonSystemSchemas(databaseSql)
  const outsideSchemas = schemas.filter(
    (schemaName) => schemaName !== allowedSchemaName,
  )
  await mapWithConcurrency(outsideSchemas, 1, async (schemaName) => {
    await transferOwnedObjectsInSchemaToRole(
      databaseSql,
      schemaName,
      appRoleName,
      fallbackOwnerRole,
    )
    await revokeDefaultPrivilegesOnSchema(databaseSql, schemaName, appRoleName)

    const quotedSchemaName = quoteCatalogIdentifier(schemaName)
    const quotedAppRoleName = quoteIdentifier(appRoleName)

    await databaseSql.unsafe(
      `REVOKE ALL PRIVILEGES ON SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`,
    )
    await databaseSql.unsafe(
      `REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`,
    )
    await databaseSql.unsafe(
      `REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`,
    )
    await databaseSql.unsafe(
      `REVOKE ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA ${quotedSchemaName} FROM ${quotedAppRoleName};`,
    )
  })
}

const withAdvisoryLock = async <T>(
  sql: Bun.SQL,
  lockKey: string,
  operation: (lockedSql: Bun.ReservedSQL) => Promise<T>,
): Promise<T> => {
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

const ensurePreviewAppRole = async (
  sql: Bun.SQL,
  previewOwner: string,
  appRoleName: string,
  appPassword: string,
): Promise<void> => {
  const exists = await roleExists(sql, appRoleName)
  if (!exists) {
    await sql.unsafe(`CREATE ROLE ${quoteIdentifier(appRoleName)} LOGIN;`)
  }

  await sql.unsafe(
    `ALTER ROLE ${quoteIdentifier(appRoleName)} WITH LOGIN NOCREATEDB NOCREATEROLE INHERIT PASSWORD ${quoteLiteral(appPassword)};`,
  )

  // Allow preview owner to manage default privileges for app role objects.
  if (previewOwner !== appRoleName) {
    await sql.unsafe(
      `GRANT ${quoteIdentifier(appRoleName)} TO ${quoteIdentifier(previewOwner)} WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;`,
    )
  }
}

const syncPreviewDatabaseGrants = async (
  sql: Bun.SQL,
  config: AppConfig,
  dbName: string,
  appRoleName: string,
): Promise<void> => {
  if (!(await roleExists(sql, config.previewOwner))) {
    throw new BadRequestError(
      `configured preview owner role "${config.previewOwner}" does not exist`,
    )
  }

  const devRole = config.previewDevRole

  if (!(await roleExists(sql, devRole))) {
    throw new BadRequestError(`configured dev role "${devRole}" does not exist`)
  }

  await sql.unsafe(
    `REVOKE ALL PRIVILEGES ON DATABASE ${quoteIdentifier(dbName)} FROM ${quoteIdentifier(appRoleName)};`,
  )
  await sql.unsafe(
    `REVOKE CONNECT, TEMPORARY ON DATABASE ${quoteIdentifier(dbName)} FROM PUBLIC;`,
  )
  await sql.unsafe(
    `GRANT CONNECT, CREATE ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(appRoleName)};`,
  )
  await sql.unsafe(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(dbName)} TO ${quoteIdentifier(devRole)};`,
  )
  await setRoleSearchPath(sql, appRoleName, dbName, config.appSchema)

  await withDatabaseClient(config, dbName, async (dbSql) => {
    await lockDownPublicSchema(dbSql)
    await ensureSchemaExists(dbSql, config.appSchema, appRoleName)
    const currentSchemaOwner = await getSchemaOwnerRole(dbSql, config.appSchema)
    if (currentSchemaOwner === config.previewOwner) {
      await dbSql.unsafe(
        `GRANT USAGE, CREATE ON SCHEMA ${quoteCatalogIdentifier(config.appSchema)} TO ${quoteIdentifier(appRoleName)};`,
      )
    }
    await transferOwnedObjectsInSchemaToRole(
      dbSql,
      config.appSchema,
      config.previewOwner,
      appRoleName,
    )
    await syncAppSchemaGrants(dbSql, config.appSchema, appRoleName, devRole)

    const schemas = await listNonSystemSchemas(dbSql)
    const additionalSchemas = schemas.filter(
      (schemaName) => schemaName !== config.appSchema,
    )
    await mapWithConcurrency(additionalSchemas, 1, async (schemaName) => {
      await grantReadWriteOnSchema(dbSql, schemaName, devRole, true)
      await grantReadWriteDefaultPrivilegesOnSchema(dbSql, schemaName, devRole)
    })

    await revokeAppRoleOutsideSchema(
      dbSql,
      appRoleName,
      config.previewOwner,
      config.appSchema,
    )
  })
}

export interface EnsurePreviewDatabaseParams {
  prNumber: number
  templateDatabase: string
  owner: string
}

export const ensurePreviewDatabase = async (
  sql: Bun.SQL,
  config: AppConfig,
  params: EnsurePreviewDatabaseParams,
): Promise<{
  dbName: string
  created: boolean
  appUser: string
  appPassword: string
}> => {
  const dbName = buildPreviewDatabaseName(config.previewPrefix, params.prNumber)
  const templateDatabase = normalizeIdentifier(
    params.templateDatabase,
    "template_db",
  )
  const owner = normalizeIdentifier(params.owner, "owner")
  const appUser = buildPreviewAppRoleName(
    config.previewAppUserPrefix,
    params.prNumber,
  )
  const appPassword = derivePreviewAppPassword(
    config.previewAppPasswordSecret,
    dbName,
    appUser,
  )

  assertSafeTargetDatabaseName(dbName, config)

  return await withAdvisoryLock(sql, dbName, async (lockedSql) => {
    await ensurePreviewAppRole(
      lockedSql,
      config.previewOwner,
      appUser,
      appPassword,
    )

    const alreadyExists = await databaseExists(lockedSql, dbName)
    if (!alreadyExists) {
      const templateExists = await databaseExists(lockedSql, templateDatabase)
      if (!templateExists) {
        throw new BadRequestError(
          `template database "${templateDatabase}" does not exist`,
        )
      }

      const ownerExists = await roleExists(lockedSql, owner)
      if (!ownerExists) {
        throw new BadRequestError(`owner role "${owner}" does not exist`)
      }

      await lockedSql.unsafe(
        `CREATE DATABASE ${quoteIdentifier(dbName)} WITH TEMPLATE ${quoteIdentifier(templateDatabase)} OWNER ${quoteIdentifier(owner)} STRATEGY = FILE_COPY;`,
      )
    }

    await syncPreviewDatabaseGrants(lockedSql, config, dbName, appUser)

    return { appPassword, appUser, created: !alreadyExists, dbName }
  })
}

const countActiveDatabaseConnections = async (
  sql: Bun.SQL,
  databaseName: string,
): Promise<number> => {
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

const sanitizeRoleName = (roleName: string): string => {
  const normalized = roleName.trim() || "unknown"
  return normalized.replaceAll(/[^A-Za-z0-9_:@.-]/gu, "?").slice(0, 63)
}

const formatActiveConnectionsByRole = (
  rows: ActiveConnectionByRole[],
): string => {
  if (rows.length === 0) {
    return "none"
  }

  return rows
    .map(
      (entry) => `${sanitizeRoleName(entry.role)}(${entry.activeConnections})`,
    )
    .join(", ")
}

const getActiveConnectionsByRole = async (
  sql: Bun.SQL,
  databaseName: string,
): Promise<ActiveConnectionByRole[]> => {
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
    activeConnections: row.active_connections,
    role: row.role ?? "unknown",
  }))
}

const getActiveConnectionSummary = async (
  sql: Bun.SQL,
  databaseName: string,
): Promise<string> => {
  try {
    const rows = await getActiveConnectionsByRole(sql, databaseName)
    return formatActiveConnectionsByRole(rows)
  } catch {
    return "unavailable"
  }
}

const dropDatabase = async (
  sql: Bun.SQL,
  databaseName: string,
): Promise<void> => {
  const quotedDbName = quoteIdentifier(databaseName)

  try {
    // Project baseline is PostgreSQL 18, so DROP DATABASE ... WITH (FORCE) is supported.
    await sql.unsafe(`DROP DATABASE IF EXISTS ${quotedDbName} WITH (FORCE);`)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const normalizedMessage = message.toLowerCase()

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

const dropPreviewAppRole = async (
  sql: Bun.SQL,
  roleName: string,
): Promise<boolean> => {
  if (!(await roleExists(sql, roleName))) {
    return false
  }

  try {
    await sql.unsafe(`DROP ROLE IF EXISTS ${quoteIdentifier(roleName)};`)
    return true
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    const normalizedMessage = message.toLowerCase()

    if (
      normalizedMessage.includes(
        "cannot be dropped because some objects depend on it",
      )
    ) {
      throw new BadRequestError(
        `preview app role "${roleName}" still owns objects and cannot be dropped`,
      )
    }

    throw error
  }
}

interface NonTemplateDatabase {
  name: string
}

const listNonTemplateDatabases = async (sql: Bun.SQL): Promise<string[]> => {
  const rows = await sql<NonTemplateDatabase[]>`
    SELECT datname AS "name"
    FROM pg_database
    WHERE datistemplate = false
    ORDER BY datname ASC
  `

  return rows.map((row) => row.name)
}

const revokeBroadDatabaseConnectGrants = async (
  sql: Bun.SQL,
  roleName: string,
): Promise<number> => {
  const databases = await listNonTemplateDatabases(sql)
  await mapWithConcurrency(databases, 1, async (databaseName) => {
    await sql.unsafe(
      `REVOKE CONNECT, TEMPORARY, CREATE ON DATABASE ${quoteCatalogIdentifier(databaseName)} FROM ${quoteIdentifier(roleName)};`,
    )
  })

  return databases.length
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

export const createOrUpdateDevRole = async (
  sql: Bun.SQL,
  params: CreateOrUpdateDevRoleParams,
): Promise<CreateOrUpdateDevRoleResult> => {
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
    console.info(
      JSON.stringify({
        concurrency: DEV_ROLE_DB_GRANT_CONCURRENCY,
        event: "cli.create-dev-user.grant-connect-scope",
        total_databases: databases.length,
        username,
      }),
    )

    const perDatabaseResults = await mapWithConcurrency(
      databases,
      DEV_ROLE_DB_GRANT_CONCURRENCY,
      async (databaseName) => {
        await sql.unsafe(
          `GRANT CONNECT ON DATABASE ${quoteCatalogIdentifier(databaseName)} TO ${quoteIdentifier(username)};`,
        )

        const databaseResult = await withDatabaseClientByUrl(
          params.databaseUrl,
          databaseName,
          async (databaseSql) => {
            const schemas = await listNonSystemSchemas(databaseSql)
            const schemaResults = await mapWithConcurrency(
              schemas,
              1,
              async (schemaName) => {
                await grantReadWriteOnSchema(
                  databaseSql,
                  schemaName,
                  username,
                  true,
                )
                return await grantReadWriteDefaultPrivilegesOnSchema(
                  databaseSql,
                  schemaName,
                  username,
                )
              },
            )

            return {
              defaultPrivilegeOwnersApplied: schemaResults.reduce(
                (total, result) => total + result.applied,
                0,
              ),
              defaultPrivilegeOwnersSkipped: schemaResults.reduce(
                (total, result) => total + result.skipped,
                0,
              ),
              schemaGrantsApplied: schemas.length,
            }
          },
        )

        return {
          connectGrantsApplied: 1,
          ...databaseResult,
        }
      },
    )

    for (const result of perDatabaseResults) {
      connectGrantsApplied += result.connectGrantsApplied
      schemaGrantsApplied += result.schemaGrantsApplied
      defaultPrivilegeOwnersApplied += result.defaultPrivilegeOwnersApplied
      defaultPrivilegeOwnersSkipped += result.defaultPrivilegeOwnersSkipped
    }
  } else {
    connectGrantsRevoked = await revokeBroadDatabaseConnectGrants(sql, username)
  }

  return {
    connectGrantsApplied,
    connectGrantsRevoked,
    created: !exists,
    defaultPrivilegeOwnersApplied,
    defaultPrivilegeOwnersSkipped,
    schemaGrantsApplied,
    username,
  }
}

export interface TeardownPreviewDatabaseResult {
  dbName: string
  deleted: boolean
  activeConnectionsAtDrop: number
  appUser: string
  roleDeleted: boolean
  devGrantsCleaned: boolean
  noop: boolean
  noopReason: "database_not_found" | null
}

export const teardownPreviewDatabase = async (
  sql: Bun.SQL,
  config: AppConfig,
  prNumber: number,
): Promise<TeardownPreviewDatabaseResult> => {
  const dbName = buildPreviewDatabaseName(config.previewPrefix, prNumber)
  const appUser = buildPreviewAppRoleName(config.previewAppUserPrefix, prNumber)
  assertSafeTargetDatabaseName(dbName, config)

  return await withAdvisoryLock(sql, dbName, async (lockedSql) => {
    const exists = await databaseExists(lockedSql, dbName)
    let deleted = false
    let activeConnectionsAtDrop = 0

    if (exists) {
      activeConnectionsAtDrop = await countActiveDatabaseConnections(
        lockedSql,
        dbName,
      )
      await dropDatabase(lockedSql, dbName)
      deleted = true
    }

    const roleDeleted = await dropPreviewAppRole(lockedSql, appUser)

    return {
      activeConnectionsAtDrop,
      appUser,
      dbName,
      deleted,
      devGrantsCleaned: deleted,
      noop: !exists,
      noopReason: exists ? null : "database_not_found",
      roleDeleted,
    }
  })
}
