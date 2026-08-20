import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildMigrationPlan,
  checksumMigrationSql,
  normalizeMigrationSql,
} from "./migration-plan.mjs"

const SHA_256_CHECKSUM = /^sha256:[0-9a-f]{64}$/
const REQUIRED_MIGRATION = /at least one URL registry migration/i
const INVALID_FILENAME = /invalid migration filename/i
const DUPLICATE_VERSION = /duplicate migration version/i
const MISSING_VERSION = /expected migration version 0002/i
const EMPTY_MIGRATION = /cannot be empty/i

describe("URL registry migration plan", () => {
  it("normalizes line endings before computing a prefixed SHA-256 checksum", () => {
    const windowsSql = "CREATE TABLE example (id integer);\r\n\rSELECT 1;\r\n"
    const unixSql = "CREATE TABLE example (id integer);\n\nSELECT 1;\n"

    assert.equal(normalizeMigrationSql(windowsSql), unixSql)
    assert.equal(
      checksumMigrationSql(windowsSql),
      checksumMigrationSql(unixSql)
    )
    assert.match(checksumMigrationSql(windowsSql), SHA_256_CHECKSUM)
  })

  it("sorts a contiguous migration set by its four-digit version", () => {
    const plan = buildMigrationPlan([
      { name: "0002_add_index.sql", sql: "SELECT 2;\r\n" },
      { name: "0001_create_registry.sql", sql: "SELECT 1;\n" },
    ])

    assert.deepEqual(
      plan.map(({ name, version }) => ({ name, version })),
      [
        { name: "0001_create_registry.sql", version: 1 },
        { name: "0002_add_index.sql", version: 2 },
      ]
    )
    assert.equal(plan[1].sql, "SELECT 2;\n")
  })

  it("rejects invalid, duplicate, missing, or empty migrations", () => {
    assert.throws(() => buildMigrationPlan([]), REQUIRED_MIGRATION)
    assert.throws(
      () => buildMigrationPlan([{ name: "1_bad.sql", sql: "SELECT 1" }]),
      INVALID_FILENAME
    )
    assert.throws(
      () =>
        buildMigrationPlan([
          { name: "0001_one.sql", sql: "SELECT 1" },
          { name: "0001_two.sql", sql: "SELECT 2" },
        ]),
      DUPLICATE_VERSION
    )
    assert.throws(
      () =>
        buildMigrationPlan([
          { name: "0001_one.sql", sql: "SELECT 1" },
          { name: "0003_three.sql", sql: "SELECT 3" },
        ]),
      MISSING_VERSION
    )
    assert.throws(
      () => buildMigrationPlan([{ name: "0001_empty.sql", sql: " \r\n" }]),
      EMPTY_MIGRATION
    )
  })
})
