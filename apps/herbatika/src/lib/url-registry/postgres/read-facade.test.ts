import { describe, expect, it } from "vitest"
import { PostgresRegistryReads } from "./read-facade"
import type { SqlClient, SqlPool } from "./sql"

const unusedPool: SqlPool = {
  query: async () => ({ rows: [], rowCount: 0 }),
  connect: () =>
    Promise.reject(
      new Error("A malformed cursor must fail before leasing a client")
    ),
}

describe("PostgresRegistryReads", () => {
  it("returns cursor validation failures as rejected promises", async () => {
    const reads = new PostgresRegistryReads(unusedPool)
    const result = reads.listAuditRecords({ limit: 1, cursor: "malformed" })

    expect(result).toBeInstanceOf(Promise)
    await expect(result).rejects.toMatchObject({ code: "INVALID_COMMAND" })
  })

  it("resolves a historical static path to its current projection", async () => {
    const route = {
      created_at: "2026-08-21T00:00:00.000Z",
      equivalence_key: null,
      id: "bdca42d1-5884-4752-b85f-ad93510eb994",
      index_policy: "indexable",
      kind: "static",
      market: "sk",
      source_id: null,
      source_system: null,
      source_type: null,
      static_route_key: "root:about",
      status: "active",
      successor_route_id: null,
      target_type: "static",
      updated_at: "2026-08-21T00:00:00.000Z",
      version: 2,
    }
    const paths = [
      {
        created_at: "2026-08-20T00:00:00.000Z",
        disposition: "alias",
        id: "ad949753-78dc-42d8-9639-f536ee5749cf",
        introduced_in_version: 1,
        market: "sk",
        match_mode: "exact",
        parent_route_key: null,
        route_key: "root:about",
        segment: "stare-o-nas",
      },
      {
        created_at: "2026-08-21T00:00:00.000Z",
        disposition: "current",
        id: "768219b6-f5c4-41e2-9f14-d9138c8ca699",
        introduced_in_version: 2,
        market: "sk",
        match_mode: "exact",
        parent_route_key: null,
        route_key: "root:about",
        segment: "o-nas",
      },
    ]
    const client: SqlClient = {
      query: async (sql) =>
        sql.includes("FROM url_registry.url_route AS route")
          ? {
              rowCount: paths.length,
              rows: paths.map((path) => ({ path, route })),
            }
          : { rowCount: 0, rows: [] },
      release: () => {
        // The facade owns no observable pool cleanup state in this direct read test.
      },
    }
    const pool: SqlPool = {
      connect: async () => client,
      query: client.query,
    }

    await expect(
      new PostgresRegistryReads(pool).resolveStaticPath({
        market: "sk",
        pathSegments: ["stare-o-nas"],
      })
    ).resolves.toMatchObject({
      kind: "found",
      value: {
        canonicalPathSegments: ["o-nas"],
        disposition: "alias",
        route: { staticRouteKey: "root:about" },
      },
    })
  })
})
