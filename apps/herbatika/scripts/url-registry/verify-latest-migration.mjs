import { isMigrationChecksum } from "./migration-plan.mjs"

const LATEST_MIGRATION_SQL = `
  SELECT name, checksum
  FROM url_registry.schema_migrations
  ORDER BY name DESC
  LIMIT 1
`

const assertExpectedMigration = (expected) => {
  if (
    !expected ||
    typeof expected.name !== "string" ||
    !isMigrationChecksum(expected.checksum)
  ) {
    throw new Error("Expected latest URL registry migration is invalid")
  }
}

export const verifyLatestUrlRegistryMigration = async ({
  executor,
  expected,
}) => {
  if (!executor || typeof executor.query !== "function") {
    throw new TypeError("A SQL executor is required to verify URL migrations")
  }
  assertExpectedMigration(expected)

  const result = await executor.query(LATEST_MIGRATION_SQL)
  const actual = result?.rows?.[0]
  if (!actual) {
    throw new Error("URL registry has no applied migrations")
  }
  if (
    typeof actual.name !== "string" ||
    !isMigrationChecksum(actual.checksum)
  ) {
    throw new Error("URL registry returned an invalid latest migration row")
  }
  if (actual.name !== expected.name || actual.checksum !== expected.checksum) {
    throw new Error(
      `URL registry latest migration mismatch: expected ${expected.name}`
    )
  }

  return Object.freeze({ name: actual.name, checksum: actual.checksum })
}
