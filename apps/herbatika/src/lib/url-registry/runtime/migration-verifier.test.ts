import { describe, expect, it, vi } from "vitest"
import type { SqlClient, SqlPool, SqlQueryResult } from "../postgres"
import type { UrlRegistryMigrationManifest } from "./manifest"
import {
  assertAppliedMigrationManifest,
  verifyUrlRegistryMigrations,
} from "./migration-verifier"

const manifest = Object.freeze([
  Object.freeze({
    checksum: `sha256:${"a".repeat(64)}`,
    name: "0001_first.sql",
    version: 1,
  }),
  Object.freeze({
    checksum: `sha256:${"b".repeat(64)}`,
    name: "0002_second.sql",
    version: 2,
  }),
]) satisfies UrlRegistryMigrationManifest

const rows = manifest.map(({ checksum, name }) => ({ checksum, name }))

const result = (returnedRows: readonly unknown[] = []): SqlQueryResult => ({
  rowCount: returnedRows.length,
  rows: returnedRows,
})

const fakePool = (ledgerRows: readonly unknown[]) => {
  const queries: Array<{ sql: string; values?: readonly unknown[] }> = []
  const release = vi.fn()
  const client: SqlClient = {
    query: vi.fn((sql, values) => {
      queries.push({ sql, values })
      return Promise.resolve(
        sql.includes("schema_migrations") ? result(ledgerRows) : result()
      )
    }),
    release,
  }
  const pool: SqlPool = {
    connect: vi.fn(async () => client),
    query: vi.fn(async () => result()),
  }
  return { client, pool, queries, release }
}

describe("assertAppliedMigrationManifest", () => {
  it("accepts only the exact ordered migration list", () => {
    expect(() => assertAppliedMigrationManifest(rows, manifest)).not.toThrow()
  })

  it.each([
    ["missing", rows.slice(0, 1)],
    [
      "extra",
      [
        ...rows,
        { checksum: `sha256:${"c".repeat(64)}`, name: "0003_extra.sql" },
      ],
    ],
    ["out of order", [...rows].reverse()],
    ["duplicate", [rows[0], rows[0]]],
    [
      "checksum drift",
      [{ ...rows[0], checksum: `sha256:${"c".repeat(64)}` }, rows[1]],
    ],
  ])("rejects a %s ledger", (_label, actualRows) => {
    expect(() =>
      assertAppliedMigrationManifest(actualRows, manifest)
    ).toThrowError()
  })

  it.each([
    null,
    [],
    { name: "0001_first.sql" },
    { checksum: 1, name: "0001_first.sql" },
  ])("rejects the malformed row %j", (row) => {
    expect(() => assertAppliedMigrationManifest([row], manifest)).toThrow(
      "invalid migration row"
    )
  })
})

describe("verifyUrlRegistryMigrations", () => {
  it("uses one read-only transaction with a bounded server timeout", async () => {
    const database = fakePool(
      manifest.map(({ checksum, name }) => ({ checksum, name }))
    )

    await verifyUrlRegistryMigrations(database.pool, manifest)

    expect(database.queries).toHaveLength(4)
    expect(database.queries[0]?.sql).toContain("BEGIN READ ONLY")
    expect(database.queries[1]).toMatchObject({ values: ["2000ms"] })
    expect(database.queries[1]?.sql).toContain("statement_timeout")
    expect(database.queries[2]?.sql).toContain("schema_migrations")
    expect(database.queries[3]?.sql).toBe("ROLLBACK")
    expect(database.release).toHaveBeenCalledOnce()
  })

  it("rolls back and releases while preserving a verification failure", async () => {
    const primary = new Error("ledger unavailable")
    const database = fakePool(rows)
    vi.mocked(database.client.query).mockImplementation((sql) => {
      if (sql.includes("schema_migrations")) {
        return Promise.reject(primary)
      }
      if (sql === "ROLLBACK") {
        return Promise.reject(new Error("rollback failed"))
      }
      return Promise.resolve(result())
    })
    database.release.mockImplementation(() => {
      throw new Error("release failed")
    })

    await expect(
      verifyUrlRegistryMigrations(database.pool, manifest)
    ).rejects.toBe(primary)
  })
})
