import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import pg from "pg"
import {
  loadUrlRegistryMigrationPlan,
  requireMigrationDatabaseUrl,
} from "./migration-files.mjs"
import { runUrlRegistryMigrations } from "./migration-runner.mjs"

export const DEFAULT_URL_REGISTRY_MIGRATIONS_DIRECTORY = fileURLToPath(
  new URL("../../src/lib/url-registry/migrations/", import.meta.url)
)

const defaultCreatePool = (config) => new pg.Pool(config)

const errorMessage = (error) =>
  error instanceof Error ? error.message : "Unknown migration failure"

export const runUrlRegistryMigrationCli = async ({
  environment = process.env,
  migrationsDirectory = DEFAULT_URL_REGISTRY_MIGRATIONS_DIRECTORY,
  loadPlan = loadUrlRegistryMigrationPlan,
  createPool = defaultCreatePool,
  runMigrations = runUrlRegistryMigrations,
  stdout = process.stdout,
  stderr = process.stderr,
} = {}) => {
  const connectionString = requireMigrationDatabaseUrl(environment)
  const plan = await loadPlan({ migrationsDirectory })
  const pool = createPool({
    connectionString,
    max: 1,
    application_name: "herbatika-url-registry-migrator",
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000,
    query_timeout: 125_000,
    statement_timeout: 120_000,
  })

  return runMigrations({
    pool,
    plan,
    onEvent: ({ type, name }) => {
      stdout.write(`${type} ${name}\n`)
    },
    onCleanupError: ({ phase, error }) => {
      stderr.write(
        `URL registry migration cleanup failed during ${phase}: ${errorMessage(error)}\n`
      )
    },
  })
}

const entrypoint = process.argv[1]
const isEntrypoint =
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href

if (isEntrypoint) {
  runUrlRegistryMigrationCli().catch((error) => {
    process.stderr.write(
      `URL registry migration failed: ${errorMessage(error)}\n`
    )
    process.exitCode = 1
  })
}
