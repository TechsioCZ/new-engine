import { describe, expect, it, vi } from "vitest"
import type {
  ClaimedInvalidationOutboxEvent,
  InvalidationOutboxStore,
} from "../postgres/invalidation-outbox-store"
import {
  dispatchInvalidationOutboxBatch,
  INVALIDATION_DISPATCH_BATCH_SIZE,
  INVALIDATION_DISPATCH_LEASE_MS,
  invalidationRetryDelayMs,
} from "./invalidation-dispatcher"

const NOW = new Date("2026-08-19T10:00:00.000Z")
const claim = (
  id: string,
  attemptCount = 1
): ClaimedInvalidationOutboxEvent => ({
  attemptCount,
  claimToken: `claim:${id}`,
  id,
  tags: ["market:sk"],
})

const store = (claims: readonly ClaimedInvalidationOutboxEvent[]) =>
  ({
    claim: vi.fn(async () => [...claims]),
    fail: vi.fn(async () => true),
    health: vi.fn(async () => ({
      delivered: 0,
      failed: 0,
      pending: 0,
      processing: 0,
    })),
    markDelivered: vi.fn(async () => true),
    reclaimExpired: vi.fn(async () => 2),
    retry: vi.fn(async () => true),
  }) satisfies InvalidationOutboxStore

const logger = () => ({ error: vi.fn(), info: vi.fn() })

describe("URL registry invalidation outbox dispatcher", () => {
  it("reclaims expired leases before claiming a bounded batch", async () => {
    const outbox = store([])
    const result = await dispatchInvalidationOutboxBatch({
      deliver: vi.fn(),
      logger: logger(),
      now: () => NOW,
      store: outbox,
      workerId: "worker-1",
    })

    expect(result).toEqual({
      claimed: 0,
      delivered: 0,
      failed: 0,
      reclaimed: 2,
      retried: 0,
      transitionConflicts: 0,
    })
    expect(outbox.reclaimExpired).toHaveBeenCalledWith({
      batchSize: INVALIDATION_DISPATCH_BATCH_SIZE,
      leaseDurationMs: INVALIDATION_DISPATCH_LEASE_MS,
      now: NOW,
    })
    expect(outbox.claim).toHaveBeenCalledWith({
      batchSize: INVALIDATION_DISPATCH_BATCH_SIZE,
      now: NOW,
      workerId: "worker-1",
    })
    expect(outbox.reclaimExpired.mock.invocationCallOrder[0]).toBeLessThan(
      outbox.claim.mock.invocationCallOrder[0] ?? 0
    )
  })

  it("records delivered, retry, permanent failure, and stale-lease conflicts", async () => {
    const outbox = store([
      claim("delivered"),
      claim("retry", 3),
      claim("failed"),
      claim("stale"),
    ])
    outbox.markDelivered
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    const log = logger()
    const result = await dispatchInvalidationOutboxBatch({
      deliver: vi.fn((item) => {
        if (item.id === "retry") {
          return Promise.resolve({
            errorCode: "http-503",
            kind: "retry" as const,
          })
        }
        if (item.id === "failed") {
          return Promise.resolve({
            errorCode: "http-401",
            kind: "failed" as const,
          })
        }
        return Promise.resolve({
          kind: "delivered" as const,
          replayed: item.id === "stale",
        })
      }),
      logger: log,
      now: () => NOW,
      store: outbox,
      workerId: "worker-1",
    })

    expect(result).toMatchObject({
      claimed: 4,
      delivered: 1,
      failed: 1,
      retried: 1,
      transitionConflicts: 1,
    })
    expect(outbox.retry).toHaveBeenCalledWith({
      claimToken: "claim:retry",
      errorCode: "http-503",
      id: "retry",
      now: NOW,
      retryAfterMs: 20_000,
    })
    expect(outbox.fail).toHaveBeenCalledWith({
      claimToken: "claim:failed",
      errorCode: "http-401",
      id: "failed",
      now: NOW,
    })
    expect(log.error.mock.calls.flat().join(" ")).toContain("failed")
    expect(log.error.mock.calls.flat().join(" ")).not.toContain("Bearer")
  })

  it.each([
    [1, undefined, 5000],
    [3, undefined, 20_000],
    [1, 120_000, 120_000],
    [50, 99_000_000, 3_600_000],
  ])("bounds retry attempt %i", (attempt, hint, expected) => {
    expect(invalidationRetryDelayMs(attempt, hint)).toBe(expected)
  })
})
