import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { Pool } from "pg"
import { PostgresUrlRegistry } from "./postgres"

const WHITESPACE_PATTERN = /\s+/g

const row = {
  id: "old-current",
  market: "sk",
  kind: "product",
  slug: "old-slug",
  entity_id: "prod_1",
  equivalence_key: "product:prod_1",
  indexable: true,
  status: "current",
  alias_of: null,
  updated_at: new Date("2026-08-05T00:00:00Z"),
} as const

describe("PostgresUrlRegistry transaction orchestration", () => {
  it("re-points aliases and inserts the new current in one transaction", async () => {
    const statements: string[] = []
    const client = {
      query: vi.fn((sql: string) => {
        statements.push(sql.replace(WHITESPACE_PATTERN, " ").trim())
        if (sql.includes("SELECT") && sql.includes("FOR UPDATE")) {
          return { rows: [row] }
        }
        if (sql.includes("INSERT INTO")) {
          return {
            rows: [
              {
                ...row,
                id: "new-current",
                slug: "new-slug",
                updated_at: new Date("2026-08-06T00:00:00Z"),
              },
            ],
          }
        }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    const pool = Object.assign(Object.create(Pool.prototype), {
      connect: vi.fn(() => Promise.resolve(client)),
    }) as Pool
    const registry = new PostgresUrlRegistry(pool)

    await expect(
      registry.changeSlug("sk", "product", "prod_1", "new-slug")
    ).resolves.toMatchObject({ slug: "new-slug", status: "current" })

    expect(statements[0]).toBe("BEGIN")
    expect(statements.some((sql) => sql.includes("status = 'alias'"))).toBe(
      true
    )
    expect(
      statements.findIndex((sql) => sql.startsWith("UPDATE"))
    ).toBeLessThan(statements.findIndex((sql) => sql.startsWith("INSERT")))
    expect(statements.at(-1)).toBe("COMMIT")
    expect(client.release).toHaveBeenCalledOnce()
  })

  it("rolls back and translates Postgres unique violations", async () => {
    const statements: string[] = []
    const client = {
      query: vi.fn((sql: string) => {
        statements.push(sql.replace(WHITESPACE_PATTERN, " ").trim())
        if (sql.includes("SELECT") && sql.includes("FOR UPDATE")) {
          return { rows: [row] }
        }
        if (sql.includes("INSERT INTO")) {
          throw Object.assign(new Error("duplicate"), { code: "23505" })
        }
        return { rows: [] }
      }),
      release: vi.fn(),
    }
    const pool = Object.assign(Object.create(Pool.prototype), {
      connect: vi.fn(() => Promise.resolve(client)),
    }) as Pool
    const registry = new PostgresUrlRegistry(pool)

    await expect(
      registry.changeSlug("sk", "product", "prod_1", "new-slug")
    ).rejects.toMatchObject({ code: "UNIQUE_VIOLATION" })
    expect(statements.at(-1)).toBe("ROLLBACK")
    expect(client.release).toHaveBeenCalledOnce()
  })
})
