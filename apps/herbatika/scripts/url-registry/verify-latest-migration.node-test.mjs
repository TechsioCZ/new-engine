import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { verifyLatestUrlRegistryMigration } from "./verify-latest-migration.mjs"

const NO_MIGRATIONS = /has no applied migrations/i
const LATEST_MISMATCH = /latest migration mismatch/i
const INVALID_ROW = /invalid latest migration row/i

describe("verifyLatestUrlRegistryMigration", () => {
  it("accepts the exact expected migration name and checksum", async () => {
    const expected = {
      name: "0001_create_url_registry.sql",
      checksum: `sha256:${"a".repeat(64)}`,
    }
    const executor = {
      query: async () => ({ rows: [expected], rowCount: 1 }),
    }

    await assert.doesNotReject(
      verifyLatestUrlRegistryMigration({ executor, expected })
    )
  })

  it("fails closed for a missing, stale, or malformed migration ledger", async () => {
    const expected = {
      name: "0002_add_index.sql",
      checksum: `sha256:${"b".repeat(64)}`,
    }

    await assert.rejects(
      verifyLatestUrlRegistryMigration({
        executor: { query: async () => ({ rows: [], rowCount: 0 }) },
        expected,
      }),
      NO_MIGRATIONS
    )
    await assert.rejects(
      verifyLatestUrlRegistryMigration({
        executor: {
          query: async () => ({
            rows: [
              {
                name: "0001_create_url_registry.sql",
                checksum: `sha256:${"a".repeat(64)}`,
              },
            ],
            rowCount: 1,
          }),
        },
        expected,
      }),
      LATEST_MISMATCH
    )
    await assert.rejects(
      verifyLatestUrlRegistryMigration({
        executor: {
          query: async () => ({ rows: [{ name: 1, checksum: null }] }),
        },
        expected,
      }),
      INVALID_ROW
    )
  })
})
