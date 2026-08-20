import { describe, expect, it } from "vitest"
import { PostgresRegistryReads } from "./read-facade"
import type { SqlPool } from "./sql"

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
})
