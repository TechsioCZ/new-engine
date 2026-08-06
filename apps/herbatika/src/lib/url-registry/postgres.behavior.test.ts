import { randomUUID } from "node:crypto"
import { describe, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { runUrlRegistryBehaviorSuite } from "./behavior-contract"
import { PostgresUrlRegistry } from "./postgres"

const connectionString = process.env.URL_REGISTRY_TEST_DATABASE_URL
const suite = connectionString ? describe : describe.skip

runUrlRegistryBehaviorSuite(
  "postgres registry behavior contract",
  () => {
    if (!connectionString) {
      throw new Error("URL_REGISTRY_TEST_DATABASE_URL is required")
    }
    const key = randomUUID()
    const entityId = `behavior-${key}`
    const registry = new PostgresUrlRegistry({ connectionString })
    return Promise.resolve({
      registry,
      entityId,
      slugPrefix: `behavior-${key}`,
      cleanup: async () => {
        await registry.pool.query(
          "DELETE FROM url_registry.url_records WHERE entity_id LIKE $1",
          [`${entityId}%`]
        )
        await registry.close()
      },
    })
  },
  suite
)
