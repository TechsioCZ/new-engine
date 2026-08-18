import { createHash } from "node:crypto"

const MIGRATION_NAME_PATTERN = /^(\d{4})_[a-z][a-z0-9]*(?:_[a-z0-9]+)*\.sql$/
const CHECKSUM_PATTERN = /^sha256:[0-9a-f]{64}$/

export const normalizeMigrationSql = (sql) => {
  if (typeof sql !== "string") {
    throw new TypeError("Migration SQL must be a string")
  }
  return sql.replace(/\r\n?/g, "\n")
}

export const checksumMigrationSql = (sql) => {
  const normalizedSql = normalizeMigrationSql(sql)
  const digest = createHash("sha256")
    .update(normalizedSql, "utf8")
    .digest("hex")
  return `sha256:${digest}`
}

export const isMigrationChecksum = (value) =>
  typeof value === "string" && CHECKSUM_PATTERN.test(value)

export const buildMigrationPlan = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("At least one URL registry migration is required")
  }

  const names = new Set()
  const versions = new Set()
  const plan = entries.map((entry) => {
    if (!entry || typeof entry.name !== "string") {
      throw new Error("Each URL registry migration requires a filename")
    }
    if (names.has(entry.name)) {
      throw new Error(`Duplicate migration filename: ${entry.name}`)
    }
    names.add(entry.name)

    const match = MIGRATION_NAME_PATTERN.exec(entry.name)
    if (!match) {
      throw new Error(`Invalid migration filename: ${entry.name}`)
    }
    const version = Number.parseInt(match[1], 10)
    if (versions.has(version)) {
      throw new Error(`Duplicate migration version: ${match[1]}`)
    }
    versions.add(version)

    const sql = normalizeMigrationSql(entry.sql)
    if (sql.trim().length === 0) {
      throw new Error(`Migration ${entry.name} cannot be empty`)
    }

    return Object.freeze({
      version,
      name: entry.name,
      sql,
      checksum: checksumMigrationSql(sql),
    })
  })

  plan.sort((left, right) => left.version - right.version)
  for (const [index, migration] of plan.entries()) {
    const expectedVersion = index + 1
    if (migration.version !== expectedVersion) {
      const expectedLabel = String(expectedVersion).padStart(4, "0")
      throw new Error(
        `Expected migration version ${expectedLabel}, found ${migration.name}`
      )
    }
  }

  return Object.freeze(plan)
}

export const latestMigrationFromPlan = (plan) => {
  if (!Array.isArray(plan) || plan.length === 0) {
    throw new Error("Cannot select a latest migration from an empty plan")
  }
  const latest = plan.at(-1)
  if (!(latest && isMigrationChecksum(latest.checksum))) {
    throw new Error("Migration plan has an invalid latest entry")
  }
  return Object.freeze({ name: latest.name, checksum: latest.checksum })
}
