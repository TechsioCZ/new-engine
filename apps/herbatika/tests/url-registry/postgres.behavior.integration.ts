import { afterAll, beforeAll, describe } from "vitest"
import { runUrlRegistryBehaviorSuite } from "@/lib/url-registry/behavior-contract"
import {
  createPostgresTestContext,
  type PostgresTestContext,
} from "./postgres-test-harness"

let context: PostgresTestContext

beforeAll(async () => {
  context = await createPostgresTestContext()
  await context.reset()
})

afterAll(async () => {
  await context?.close()
})

runUrlRegistryBehaviorSuite(
  "PostgreSQL 18.1 URL registry behavior contract",
  async () => {
    await context.reset()
    return {
      namespace: context.nextNamespace("behavior"),
      registry: context.registry,
      cleanup: context.reset,
    }
  },
  describe.sequential
)
