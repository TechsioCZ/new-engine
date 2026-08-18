import { describe, expect, it, vi } from "vitest"
import type { ClaimedUrlRegistryOutboxEvent } from "../../../modules/url-registry-outbox/delivery-state-contracts"
import {
  computeUrlRegistryRetryDelayMs,
  dispatchUrlRegistryOutboxBatch,
  URL_REGISTRY_CLAIM_BATCH_SIZE,
  URL_REGISTRY_LEASE_DURATION_MS,
} from "../dispatcher"

const NOW = new Date("2026-08-18T10:00:00.000Z")
const TOKEN = "urlr-lifecycle-token-with-at-least-32-characters"

const claim = (
  id: string,
  overrides: Partial<ClaimedUrlRegistryOutboxEvent> = {}
): ClaimedUrlRegistryOutboxEvent => ({
  attemptCount: 1,
  changeType: "reconcile",
  claimToken: `claim-${id}`,
  claimedAt: NOW.toISOString(),
  claimedBy: "worker-01",
  entityId: `prod-${id}`,
  entityKind: "product",
  envelopeFingerprint: `sha256:${"a".repeat(64)}`,
  eventId: `business-${id}`,
  id,
  leaseExpiresAt: new Date(
    NOW.getTime() + URL_REGISTRY_LEASE_DURATION_MS
  ).toISOString(),
  marketCode: "sk",
  occurredAt: NOW.toISOString(),
  payload: {
    changeType: "reconcile",
    productId: `prod-${id}`,
    reason: "updated",
    schemaVersion: 1,
  },
  source: "medusa",
  status: "processing",
  streamId: `stream-${id}`,
  streamSequence: 1,
  ...overrides,
})

const service = (claims: readonly ClaimedUrlRegistryOutboxEvent[]) => ({
  acknowledgeUrlRegistryOutboxEvent: vi.fn(() => Promise.resolve()),
  claimUrlRegistryOutboxEvents: vi.fn(async () => claims),
  failUrlRegistryOutboxEvent: vi.fn(() => Promise.resolve()),
  reclaimExpiredUrlRegistryOutboxEvents: vi.fn(async () => []),
  retryUrlRegistryOutboxEvent: vi.fn(() => Promise.resolve()),
})

const logger = () => ({
  error: vi.fn(),
  info: vi.fn(),
})

describe("computeUrlRegistryRetryDelayMs", () => {
  it.each([
    [1, undefined, 5000],
    [2, undefined, 10_000],
    [4, undefined, 40_000],
    [20, undefined, 3_600_000],
    [1, 120_000, 120_000],
    [1, 99_000_000, 3_600_000],
  ])("bounds exponential attempt %i with Retry-After %s", (attemptCount, retryAfterMs, expected) => {
    expect(computeUrlRegistryRetryDelayMs(attemptCount, retryAfterMs)).toBe(
      expected
    )
  })
})

describe("dispatchUrlRegistryOutboxBatch", () => {
  it("reclaims expired leases before claiming a fixed bounded batch", async () => {
    const outbox = service([])

    const result = await dispatchUrlRegistryOutboxBatch({
      deliver: vi.fn(),
      logger: logger(),
      now: () => NOW,
      service: outbox,
      workerId: "worker-01",
    })

    expect(result).toEqual({
      acknowledged: 0,
      claimed: 0,
      failed: 0,
      retried: 0,
      transitionErrors: 0,
    })
    expect(outbox.reclaimExpiredUrlRegistryOutboxEvents).toHaveBeenCalledWith({
      limit: URL_REGISTRY_CLAIM_BATCH_SIZE,
      now: NOW,
    })
    expect(outbox.claimUrlRegistryOutboxEvents).toHaveBeenCalledWith({
      claimedBy: "worker-01",
      leaseDurationMs: URL_REGISTRY_LEASE_DURATION_MS,
      limit: URL_REGISTRY_CLAIM_BATCH_SIZE,
      now: NOW,
    })
    expect(
      outbox.reclaimExpiredUrlRegistryOutboxEvents.mock.invocationCallOrder[0]
    ).toBeLessThan(
      outbox.claimUrlRegistryOutboxEvents.mock.invocationCallOrder[0] ?? 0
    )
  })

  it("delivers the claimed batch in parallel", async () => {
    const claims = [claim("row-1"), claim("row-2")]
    const outbox = service(claims)
    const resolvers: Array<() => void> = []
    const deliver = vi.fn(
      async () =>
        await new Promise<{
          kind: "acknowledge"
          outcome: "applied"
        }>((resolve) => {
          resolvers.push(() =>
            resolve({ kind: "acknowledge", outcome: "applied" })
          )
        })
    )

    const pending = dispatchUrlRegistryOutboxBatch({
      deliver,
      logger: logger(),
      now: () => NOW,
      service: outbox,
      workerId: "worker-01",
    })
    await vi.waitFor(() => expect(deliver).toHaveBeenCalledTimes(2))
    for (const resolve of resolvers) {
      resolve()
    }
    await pending

    expect(outbox.acknowledgeUrlRegistryOutboxEvent).toHaveBeenCalledTimes(2)
  })

  it("performs exactly one matching transition for every claim", async () => {
    const claims = [
      claim("row-ack"),
      claim("row-retry", { attemptCount: 3 }),
      claim("row-fail"),
      claim("row-throw"),
    ]
    const outbox = service(claims)
    const log = logger()
    const deliver = vi.fn(async (event: ClaimedUrlRegistryOutboxEvent) => {
      if (event.id === "row-ack") {
        return {
          kind: "acknowledge" as const,
          outcome: "already-applied" as const,
        }
      }
      if (event.id === "row-retry") {
        return {
          errorCode: "http-429",
          kind: "retry" as const,
          retryAfterMs: 60_000,
        }
      }
      if (event.id === "row-fail") {
        return { errorCode: "http-409", kind: "fail" as const }
      }
      throw new Error("private response body and secret")
    })

    const result = await dispatchUrlRegistryOutboxBatch({
      deliver,
      logger: log,
      now: () => NOW,
      service: outbox,
      workerId: "worker-01",
    })

    expect(result).toEqual({
      acknowledged: 1,
      claimed: 4,
      failed: 1,
      retried: 2,
      transitionErrors: 0,
    })
    expect(outbox.acknowledgeUrlRegistryOutboxEvent).toHaveBeenCalledOnce()
    expect(outbox.acknowledgeUrlRegistryOutboxEvent).toHaveBeenCalledWith({
      claimToken: "claim-row-ack",
      id: "row-ack",
      now: NOW,
      outcome: "already-applied",
    })
    expect(outbox.failUrlRegistryOutboxEvent).toHaveBeenCalledOnce()
    expect(outbox.failUrlRegistryOutboxEvent).toHaveBeenCalledWith({
      claimToken: "claim-row-fail",
      errorCode: "http-409",
      id: "row-fail",
      now: NOW,
    })
    expect(outbox.retryUrlRegistryOutboxEvent).toHaveBeenCalledTimes(2)
    expect(outbox.retryUrlRegistryOutboxEvent).toHaveBeenCalledWith({
      claimToken: "claim-row-retry",
      errorCode: "http-429",
      id: "row-retry",
      now: NOW,
      retryAfterMs: 60_000,
    })
    expect(outbox.retryUrlRegistryOutboxEvent).toHaveBeenCalledWith({
      claimToken: "claim-row-throw",
      errorCode: "delivery-error",
      id: "row-throw",
      now: NOW,
      retryAfterMs: 5000,
    })
    expect(
      outbox.acknowledgeUrlRegistryOutboxEvent.mock.calls.length +
        outbox.retryUrlRegistryOutboxEvent.mock.calls.length +
        outbox.failUrlRegistryOutboxEvent.mock.calls.length
    ).toBe(claims.length)
    const permanentLog = log.error.mock.calls.flat().join(" ")
    expect(permanentLog).toContain("row-fail")
    expect(permanentLog).toContain("http-409")
    expect(permanentLog).not.toContain(TOKEN)
    expect(permanentLog).not.toContain("private response")
  })

  it("attempts every claim transition even when one transition fails", async () => {
    const claims = [claim("row-1"), claim("row-2")]
    const outbox = service(claims)
    outbox.acknowledgeUrlRegistryOutboxEvent
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValueOnce(undefined)

    const result = await dispatchUrlRegistryOutboxBatch({
      deliver: vi.fn(async () => ({
        kind: "acknowledge" as const,
        outcome: "applied" as const,
      })),
      logger: logger(),
      now: () => NOW,
      service: outbox,
      workerId: "worker-01",
    })

    expect(outbox.acknowledgeUrlRegistryOutboxEvent).toHaveBeenCalledTimes(2)
    expect(result.transitionErrors).toBe(1)
  })
})
