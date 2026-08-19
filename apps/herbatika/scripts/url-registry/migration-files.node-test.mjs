import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  loadUrlRegistryMigrationPlan,
  requireMigrationDatabaseUrl,
} from "./migration-files.mjs"

const REQUIRED_DATABASE_URL = /URL_REGISTRY_MIGRATION_DATABASE_URL is required/
const SURROUNDING_WHITESPACE = /must not contain surrounding whitespace/i
const POSTGRES_PROTOCOL = /must use postgres/i
const PATH_SEPARATOR = /[/\\]/
const INVALID_FILENAME = /invalid migration filename/i
const REGULAR_FILE = /must be a regular file/i

const file = (name) => ({ name, isFile: () => true })

describe("URL registry migration files", () => {
  it("requires only the dedicated migration database URL", () => {
    assert.throws(
      () =>
        requireMigrationDatabaseUrl({
          DATABASE_URL: "postgresql://wrong.example/app",
        }),
      REQUIRED_DATABASE_URL
    )
    assert.equal(
      requireMigrationDatabaseUrl({
        URL_REGISTRY_MIGRATION_DATABASE_URL:
          "postgresql://urlr.example/url_registry",
      }),
      "postgresql://urlr.example/url_registry"
    )
    assert.throws(
      () =>
        requireMigrationDatabaseUrl({
          URL_REGISTRY_MIGRATION_DATABASE_URL: " postgres://urlr.example/db ",
        }),
      SURROUNDING_WHITESPACE
    )
    assert.throws(
      () =>
        requireMigrationDatabaseUrl({
          URL_REGISTRY_MIGRATION_DATABASE_URL: "https://urlr.example/db",
        }),
      POSTGRES_PROTOCOL
    )
  })

  it("loads, normalizes, and orders only strict SQL migration files", async () => {
    const contents = new Map([
      ["0002_add_index.sql", "SELECT 2;\r\n"],
      ["0001_create_registry.sql", "SELECT 1;\n"],
    ])
    const plan = await loadUrlRegistryMigrationPlan({
      migrationsDirectory: "C:\\urlr\\migrations",
      readdir: async () => [
        file("notes.md"),
        file("0002_add_index.sql"),
        file("0001_create_registry.sql"),
      ],
      readFile: async (path) => contents.get(path.split(PATH_SEPARATOR).at(-1)),
    })

    assert.deepEqual(
      plan.map(({ name, sql }) => ({ name, sql })),
      [
        { name: "0001_create_registry.sql", sql: "SELECT 1;\n" },
        { name: "0002_add_index.sql", sql: "SELECT 2;\n" },
      ]
    )
  })

  it("rejects malformed SQL filenames and non-file SQL entries", async () => {
    await assert.rejects(
      loadUrlRegistryMigrationPlan({
        migrationsDirectory: "/migrations",
        readdir: async () => [file("01_bad.sql")],
        readFile: async () => "SELECT 1;",
      }),
      INVALID_FILENAME
    )
    await assert.rejects(
      loadUrlRegistryMigrationPlan({
        migrationsDirectory: "/migrations",
        readdir: async () => [
          { name: "0001_directory.sql", isFile: () => false },
        ],
        readFile: async () => "SELECT 1;",
      }),
      REGULAR_FILE
    )
  })
})
