import { describe, expect, it } from "vitest"
import type { SqlClient, SqlPool } from "../../src/lib/url-registry/postgres"
import { URL_REGISTRY_MIGRATION_MANIFEST_V7 } from "../../src/lib/url-registry/runtime/manifest"
import { createFourMarketConvergenceReader } from "./convergence-db"

type QueryLog = { sql: string; values?: readonly unknown[] }
const RAW_SHA256 = /^[a-f0-9]{64}$/
const MUTATION_SQL = /\b(?:COMMIT|INSERT|UPDATE|DELETE|TRUNCATE)\b/i
const MIGRATION_ERROR = /migration ledger|behind/

const fakePool = (
  database: "medusa" | "urlr",
  log: QueryLog[],
  ledger: readonly Readonly<{
    checksum: string
    name: string
    version: number
  }>[] = URL_REGISTRY_MIGRATION_MANIFEST_V7
): SqlPool & Readonly<{ end: () => Promise<void> }> => {
  const query = (sql: string, values?: readonly unknown[]) => {
    log.push({ sql, values })
    if (sql.includes("schema_migrations")) {
      return Promise.resolve({
        rowCount: ledger.length,
        rows: ledger.map(({ checksum, name }) => ({ checksum, name })),
      })
    }
    if (database === "medusa" && sql.includes("outbox_stream")) {
      return Promise.resolve({ rowCount: 0, rows: [] })
    }
    if (database === "urlr" && sql.includes("url_registry.")) {
      return Promise.resolve({ rowCount: 0, rows: [] })
    }
    return Promise.resolve({ rowCount: null, rows: [] })
  }
  const client: SqlClient = {
    query,
    release: () => {
      // The fake client owns no pooled resource.
    },
  }
  return {
    connect: () => Promise.resolve(client),
    end: () => Promise.resolve(),
    query,
  }
}

describe("four-market convergence DB reader", () => {
  it("uses separate repeatable-read/read-only authorities and rolls both back", async () => {
    const urls: string[] = []
    const medusaLog: QueryLog[] = []
    const urlrLog: QueryLog[] = []
    const reader = createFourMarketConvergenceReader(
      {
        medusaDatabaseUrl: "postgres://medusa@db.internal:5432/commerce",
        statementTimeoutMs: 3210,
        urlRegistryDatabaseUrl: "postgres://urlr@urlr.internal:5432/registry",
      },
      {
        poolFactory: (connectionString) => {
          urls.push(connectionString)
          return urls.length === 1
            ? fakePool("medusa", medusaLog)
            : fakePool("urlr", urlrLog)
        },
      }
    )

    const rows = await reader.read()
    await reader.close()

    expect(urls).toEqual([
      "postgres://medusa@db.internal:5432/commerce",
      "postgres://urlr@urlr.internal:5432/registry",
    ])
    expect(rows.migrationLedgerSha256).toMatch(RAW_SHA256)
    for (const log of [medusaLog, urlrLog]) {
      expect(log[0]?.sql).toBe(
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
      )
      expect(log.at(-1)?.sql).toBe("ROLLBACK")
      expect(log.some(({ values }) => values?.[0] === "3210ms")).toBe(true)
      expect(log.map(({ sql }) => sql).join("\n")).not.toMatch(MUTATION_SQL)
    }
  })

  it("rejects same database authority even through different credentials", () => {
    expect(() =>
      createFourMarketConvergenceReader({
        medusaDatabaseUrl: "postgres://medusa@db.internal/commerce?ssl=true",
        urlRegistryDatabaseUrl: "postgres://urlr@db.internal:5432/commerce",
      })
    ).toThrow("must be distinct")
  })

  it.each([
    ["behind", URL_REGISTRY_MIGRATION_MANIFEST_V7.slice(0, -1)],
    [
      "ahead",
      [
        ...URL_REGISTRY_MIGRATION_MANIFEST_V7,
        {
          checksum: `sha256:${"f".repeat(64)}`,
          name: "0008_future.sql",
          version: 8,
        },
      ],
    ],
  ])("rejects a migration ledger that is %s the build", async (_label, ledger) => {
    const reader = createFourMarketConvergenceReader(
      {
        medusaDatabaseUrl: "postgres://medusa@db.internal/commerce",
        urlRegistryDatabaseUrl: "postgres://urlr@urlr.internal/registry",
      },
      {
        poolFactory: (connectionString) =>
          connectionString.includes("urlr.internal")
            ? fakePool("urlr", [], ledger)
            : fakePool("medusa", []),
      }
    )
    await expect(reader.read()).rejects.toThrow(MIGRATION_ERROR)
    await reader.close()
  })
})
