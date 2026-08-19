import { isMigrationChecksum } from "./migration-plan.mjs"

const SELECT_APPLIED_SQL = `
  SELECT name, checksum
  FROM url_registry.schema_migrations
  ORDER BY name
`
const INSERT_APPLIED_SQL = `
  INSERT INTO url_registry.schema_migrations (name, checksum)
  VALUES ($1, $2)
`

const validateAppliedRow = (row, planByName, appliedNames) => {
  if (
    !row ||
    typeof row.name !== "string" ||
    !isMigrationChecksum(row.checksum)
  ) {
    throw new Error("Postgres returned an invalid applied migration row")
  }
  const planned = planByName.get(row.name)
  if (!planned) {
    throw new Error(`Applied migration ${row.name} is absent from the plan`)
  }
  if (appliedNames.has(row.name)) {
    throw new Error(`Migration ledger contains duplicate ${row.name}`)
  }
  if (row.checksum !== planned.checksum) {
    throw new Error(`Checksum mismatch for applied migration ${row.name}`)
  }
  return row.name
}

const assertContiguousPrefix = (plan, appliedNames) => {
  let foundUnapplied = false
  for (const migration of plan) {
    if (!appliedNames.has(migration.name)) {
      foundUnapplied = true
    } else if (foundUnapplied) {
      throw new Error(
        `Applied migrations are not a contiguous prefix at ${migration.name}`
      )
    }
  }
}

export const readAppliedMigrationNames = async (client, plan) => {
  const result = await client.query(SELECT_APPLIED_SQL)
  if (!Array.isArray(result?.rows)) {
    throw new Error("Postgres returned an invalid migration ledger")
  }

  const planByName = new Map(
    plan.map((migration) => [migration.name, migration])
  )
  const appliedNames = new Set()
  for (const row of result.rows) {
    appliedNames.add(validateAppliedRow(row, planByName, appliedNames))
  }
  assertContiguousPrefix(plan, appliedNames)
  return appliedNames
}

export const recordAppliedMigration = (client, migration) =>
  client.query(INSERT_APPLIED_SQL, [migration.name, migration.checksum])
