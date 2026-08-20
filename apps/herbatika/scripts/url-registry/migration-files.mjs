import {
  readdir as readDirectory,
  readFile as readTextFile,
} from "node:fs/promises"
import { resolve } from "node:path"
import { buildMigrationPlan } from "./migration-plan.mjs"

const POSTGRES_PROTOCOLS = new Set(["postgres:", "postgresql:"])
const SQL_FILE_PATTERN = /\.sql$/i

export const requireMigrationDatabaseUrl = (environment) => {
  const value = environment?.URL_REGISTRY_MIGRATION_DATABASE_URL
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("URL_REGISTRY_MIGRATION_DATABASE_URL is required")
  }
  if (value.trim() !== value) {
    throw new Error(
      "URL_REGISTRY_MIGRATION_DATABASE_URL must not contain surrounding whitespace"
    )
  }

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error("URL_REGISTRY_MIGRATION_DATABASE_URL must be a valid URL")
  }
  if (!POSTGRES_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("URL_REGISTRY_MIGRATION_DATABASE_URL must use postgres")
  }
  return value
}

export const loadUrlRegistryMigrationPlan = async ({
  migrationsDirectory,
  readdir = readDirectory,
  readFile = readTextFile,
}) => {
  if (
    typeof migrationsDirectory !== "string" ||
    migrationsDirectory.length === 0
  ) {
    throw new TypeError("A URL registry migrations directory is required")
  }

  const directoryEntries = await readdir(migrationsDirectory, {
    withFileTypes: true,
  })
  if (!Array.isArray(directoryEntries)) {
    throw new Error("Migration directory returned an invalid entry list")
  }

  const sqlEntries = directoryEntries.filter(({ name }) =>
    typeof name === "string" ? SQL_FILE_PATTERN.test(name) : false
  )
  const migrations = await Promise.all(
    sqlEntries.map(async (entry) => {
      if (typeof entry.isFile !== "function" || !entry.isFile()) {
        throw new Error(`Migration ${entry.name} must be a regular file`)
      }
      return {
        name: entry.name,
        sql: await readFile(resolve(migrationsDirectory, entry.name), "utf8"),
      }
    })
  )

  return buildMigrationPlan(migrations)
}
