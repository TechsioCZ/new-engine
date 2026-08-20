import type { SqlClient, SqlPool } from "../postgres"
import {
  URL_REGISTRY_MIGRATION_MANIFEST_V4,
  type UrlRegistryMigrationManifest,
} from "./manifest"

const CHECKSUM_PATTERN = /^sha256:[0-9a-f]{64}$/
const MIGRATION_NAME_PATTERN = /^(\d{4})_[a-z][a-z0-9]*(?:_[a-z0-9]+)*\.sql$/
const VERIFICATION_TIMEOUT_MS = 2000
const READ_LEDGER_SQL = `
  SELECT name, checksum
  FROM url_registry.schema_migrations
  ORDER BY name ASC
`
const SET_TIMEOUTS_SQL = `
  SELECT
    set_config('statement_timeout', $1, true),
    set_config('lock_timeout', $1, true)
`

type AppliedMigration = Readonly<{ checksum: string; name: string }>

const invalidRow = (): never => {
  throw new Error("URL registry returned an invalid migration row")
}

const parseAppliedMigration = (value: unknown): AppliedMigration => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidRow()
  }
  const name = Reflect.get(value, "name")
  const checksum = Reflect.get(value, "checksum")
  if (
    typeof name !== "string" ||
    typeof checksum !== "string" ||
    !CHECKSUM_PATTERN.test(checksum)
  ) {
    return invalidRow()
  }
  return { checksum, name }
}

const assertExpectedManifest = (manifest: UrlRegistryMigrationManifest) => {
  if (manifest.length === 0) {
    throw new Error("URL registry migration manifest cannot be empty")
  }
  for (const [index, migration] of manifest.entries()) {
    const expectedVersion = index + 1
    const match = MIGRATION_NAME_PATTERN.exec(migration.name)
    if (
      migration.version !== expectedVersion ||
      Number(match?.[1]) !== expectedVersion ||
      !CHECKSUM_PATTERN.test(migration.checksum)
    ) {
      throw new Error("URL registry migration manifest is invalid")
    }
  }
}

export const assertAppliedMigrationManifest = (
  rows: readonly unknown[],
  manifest: UrlRegistryMigrationManifest = URL_REGISTRY_MIGRATION_MANIFEST_V4
): void => {
  assertExpectedManifest(manifest)
  const applied = rows.map(parseAppliedMigration)
  if (applied.length !== manifest.length) {
    throw new Error("URL registry migration ledger is not the exact manifest")
  }
  for (const [index, expected] of manifest.entries()) {
    const actual = applied[index]
    if (
      actual?.name !== expected.name ||
      actual.checksum !== expected.checksum
    ) {
      throw new Error(
        `URL registry migration mismatch at version ${expected.version}`
      )
    }
  }
}

const rollbackQuietly = async (client: SqlClient) => {
  try {
    await client.query("ROLLBACK")
  } catch {
    // Cleanup must never replace the migration verification failure.
  }
}

const releaseQuietly = (client: SqlClient) => {
  try {
    client.release()
  } catch {
    // Pool bookkeeping must never replace the verification result.
  }
}

export const verifyUrlRegistryMigrations = async (
  pool: SqlPool,
  manifest: UrlRegistryMigrationManifest = URL_REGISTRY_MIGRATION_MANIFEST_V4
): Promise<void> => {
  const client = await pool.connect()
  let transactionOpen = false
  try {
    await client.query("BEGIN READ ONLY")
    transactionOpen = true
    await client.query(SET_TIMEOUTS_SQL, [`${VERIFICATION_TIMEOUT_MS}ms`])
    const result = await client.query(READ_LEDGER_SQL)
    assertAppliedMigrationManifest(result.rows, manifest)
    await client.query("ROLLBACK")
    transactionOpen = false
  } catch (error) {
    if (transactionOpen) {
      await rollbackQuietly(client)
    }
    throw error
  } finally {
    releaseQuietly(client)
  }
}
