# Integration Tests

The `medusa-test-utils` package provides utility functions to create integration tests for your API routes and workflows.

For example:

```ts
import { medusaIntegrationTestRunner } from "medusa-test-utils"

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("Custom endpoints", () => {
      describe("GET /store/custom", () => {
        it("returns correct message", async () => {
          const response = await api.get(
            `/store/custom`
          )
  
          expect(response.status).toEqual(200)
          expect(response.data).toHaveProperty("message")
          expect(response.data.message).toEqual("Hello, World!")
        })
      })
    })
  }
})
```

Learn more in [this documentation](https://docs.medusajs.com/v2/debugging-and-testing/testing-tools/integration-tests).

## Test environment

The integration test runner loads `.env.test`, then applies `.env.test.local` if
that ignored file exists. Keep `.env.test` committed with safe deterministic
values only.

`.env.test` explicitly selects local or in-memory providers so in-app HTTP
integration tests do not talk to dev/live infrastructure:

- `NOTIFICATION_PROVIDER=local`
- `REDIS_SESSIONS_ENABLED=0`
- `MEILISEARCH_ENABLED=0`
- `CACHE_PROVIDER=inmemory`
- `EVENT_BUS_PROVIDER=local`
- `WORKFLOW_ENGINE_PROVIDER=inmemory`
- `LOCKING_PROVIDER=postgres`
- `FILE_PROVIDER=local`

When `MEILISEARCH_ENABLED=0`, the Meilisearch plugin is not registered. Catalog
search routes return `503`, and indexing jobs/scripts no-op instead of resolving
the missing Meilisearch service.

Use `.env.test.local` only for machine-local overrides, and never put live
credentials there for integration tests.
