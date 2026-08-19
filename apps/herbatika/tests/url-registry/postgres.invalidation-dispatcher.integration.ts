import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import {
  command,
  createEntityRequest,
  entityIdentity,
} from "@/lib/url-registry/behavior-helpers"
import { createInvalidationOutboxStore } from "@/lib/url-registry/postgres/invalidation-outbox-store"
import {
  createPostgresTestContext,
  type PostgresTestContext,
} from "./postgres-test-harness"

let context: PostgresTestContext

beforeAll(() => {
  context = createPostgresTestContext()
})

beforeEach(async () => {
  await context.reset()
})

afterAll(async () => {
  await context?.close()
})

const enqueue = async (suffix: string) => {
  const namespace = context.nextNamespace(`dispatch-${suffix}`)
  await context.registry.createEntityRoute(
    command(
      `${namespace}:command`,
      createEntityRequest({
        equivalenceKey: `${namespace}:equivalence`,
        eventId: `${namespace}:event`,
        identity: entityIdentity(namespace),
        slug: `${namespace}-slug`,
      })
    )
  )
}

const readDatabaseNow = async (): Promise<Date> => {
  const result = await context.runtime.query(
    "SELECT clock_timestamp() AS database_now"
  )
  const databaseNow = result.rows[0]?.database_now
  if (!(databaseNow instanceof Date)) {
    throw new Error("Expected PostgreSQL to return its current timestamp")
  }
  return databaseNow
}

describe.sequential("PostgreSQL URL registry invalidation dispatcher", () => {
  it("claims safely across workers and rejects a stale claim transition", async () => {
    await Promise.all([enqueue("one"), enqueue("two")])
    const outbox = createInvalidationOutboxStore(context.sqlPool)
    const now = await readDatabaseNow()
    const [first, second] = await Promise.all([
      outbox.claim({ batchSize: 1, now, workerId: "worker-a" }),
      outbox.claim({ batchSize: 1, now, workerId: "worker-b" }),
    ])

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(first[0]?.id).not.toBe(second[0]?.id)
    const claimed = first[0]
    if (!claimed) {
      throw new Error("Expected an outbox claim")
    }
    await expect(
      outbox.markDelivered({
        claimToken: "stale-token",
        id: claimed.id,
        now,
      })
    ).resolves.toBe(false)
    await expect(
      outbox.markDelivered({
        claimToken: claimed.claimToken,
        id: claimed.id,
        now,
      })
    ).resolves.toBe(true)
  })

  it("backs off retries, reclaims leases, and persists permanent diagnostics", async () => {
    await Promise.all([enqueue("retry"), enqueue("failed")])
    const outbox = createInvalidationOutboxStore(context.sqlPool)
    const now = await readDatabaseNow()
    const claims = await outbox.claim({ batchSize: 2, now, workerId: "worker" })
    const retry = claims[0]
    const failed = claims[1]
    if (!(retry && failed)) {
      throw new Error("Expected two outbox claims")
    }
    await expect(
      outbox.retry({
        claimToken: retry.claimToken,
        errorCode: "http-503",
        id: retry.id,
        now,
        retryAfterMs: 5000,
      })
    ).resolves.toBe(true)
    await expect(
      outbox.fail({
        claimToken: failed.claimToken,
        errorCode: "invalid-outbox-payload",
        id: failed.id,
        now,
      })
    ).resolves.toBe(true)

    await expect(
      outbox.claim({ batchSize: 2, now, workerId: "too-early" })
    ).resolves.toEqual([])
    const retryAt = new Date(now.getTime() + 5000)
    const reclaimedClaim = await outbox.claim({
      batchSize: 2,
      now: retryAt,
      workerId: "lease-owner",
    })
    expect(reclaimedClaim).toHaveLength(1)
    await expect(
      outbox.reclaimExpired({
        batchSize: 2,
        leaseDurationMs: 60_000,
        now: new Date(retryAt.getTime() + 60_001),
      })
    ).resolves.toBe(1)

    await expect(outbox.health()).resolves.toMatchObject({
      delivered: 0,
      failed: 1,
      pending: 1,
      processing: 0,
    })
    const diagnostics = await context.runtime.query(
      `SELECT last_error_code, failed_at
       FROM url_registry.url_registry_invalidation_outbox
       WHERE id = $1::bigint`,
      [failed.id]
    )
    expect(diagnostics.rows[0]).toMatchObject({
      last_error_code: "invalid-outbox-payload",
    })
    expect(diagnostics.rows[0]?.failed_at).toBeInstanceOf(Date)
  })
})
