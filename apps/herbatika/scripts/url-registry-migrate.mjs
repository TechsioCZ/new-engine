import { createHash } from "node:crypto"
import { readdir, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const MIGRATION_FILE_PATTERN = /^\d+.*\.sql$/

const connectionString =
  process.env.URL_REGISTRY_DATABASE_URL ?? process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("URL_REGISTRY_DATABASE_URL (or DATABASE_URL) is required")
}

const migrationsDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../src/lib/url-registry/migrations"
)
const pool = new pg.Pool({ connectionString })
const client = await pool.connect()

try {
  await client.query(
    "SELECT pg_advisory_lock(hashtext('url_registry:migrations'))"
  )
  await client.query("CREATE SCHEMA IF NOT EXISTS url_registry")
  await client.query(`
    CREATE TABLE IF NOT EXISTS url_registry.schema_migrations (
      name text PRIMARY KEY,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => MIGRATION_FILE_PATTERN.test(name))
    .sort()

  for (const name of migrationNames) {
    const sql = await readFile(resolve(migrationsDirectory, name), "utf8")
    const checksum = createHash("sha256").update(sql).digest("hex")
    const applied = await client.query(
      "SELECT checksum FROM url_registry.schema_migrations WHERE name = $1",
      [name]
    )
    if (applied.rows[0]) {
      if (applied.rows[0].checksum !== checksum) {
        throw new Error(`Applied migration ${name} was modified`)
      }
      console.log(`skip ${name}`)
      continue
    }

    await client.query("BEGIN")
    try {
      await client.query(sql)
      await client.query(
        "INSERT INTO url_registry.schema_migrations (name, checksum) VALUES ($1, $2)",
        [name, checksum]
      )
      await client.query("COMMIT")
      console.log(`applied ${name}`)
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    }
  }
} finally {
  await client
    .query("SELECT pg_advisory_unlock(hashtext('url_registry:migrations'))")
    .catch((error) =>
      console.warn("Failed to release migration advisory lock", error)
    )
  client.release()
  await pool.end()
}
