import { describe, expect, it, vi } from "vitest"
import type { ClaimedInvalidationOutboxEvent } from "../postgres/invalidation-outbox-store"
import { deliverInvalidationOutboxEvent } from "./invalidation-delivery-client"

const TOKEN = "urlr-invalidation-token-with-at-least-32-chars"
const config = {
  endpoint: "https://herbatica.sk/api/url-registry/invalidate",
  token: TOKEN,
}
const event = (
  overrides: Partial<ClaimedInvalidationOutboxEvent> = {}
): ClaimedInvalidationOutboxEvent => ({
  attemptCount: 1,
  claimToken: "worker:claim",
  id: "1001",
  tags: ["market:sk", "sitemap:sk"],
  ...overrides,
})

describe("URL registry invalidation delivery client", () => {
  it("posts the exact contract and accepts an applied or replay acknowledgement", async () => {
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, _requestInit?: RequestInit) =>
        Response.json({
          invalidatedTagCount: 2,
          outboxEventId: "1001",
          replayed: true,
          schemaVersion: 1,
        })
    )
    await expect(
      deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toEqual({ kind: "delivered", replayed: true })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const requestInit = fetchImpl.mock.calls[0]?.[1]
    expect(requestInit?.method).toBe("POST")
    expect(requestInit?.headers).toMatchObject({
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
    })
    expect(JSON.parse(String(requestInit?.body))).toEqual({
      outboxEventId: "1001",
      schemaVersion: 1,
      tags: ["market:sk", "sitemap:sk"],
    })
  })

  it.each([
    408, 425, 429, 500, 502, 503, 504, 599,
  ])("retries HTTP %i with a bounded retry hint", async (status) => {
    const response = new Response(null, {
      headers: { "retry-after": "7" },
      status,
    })
    await expect(
      deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: vi.fn(async () => response) as unknown as typeof fetch,
      })
    ).resolves.toEqual({
      errorCode: `http-${status}`,
      kind: "retry",
      retryAfterMs: 7000,
    })
  })

  it.each([
    400, 401, 404, 409, 421,
  ])("permanently fails non-retryable HTTP %i", async (status) => {
    await expect(
      deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: vi.fn(
          async () => new Response(null, { status })
        ) as unknown as typeof fetch,
      })
    ).resolves.toEqual({ errorCode: `http-${status}`, kind: "failed" })
  })

  it("caps Retry-After hints from both seconds and HTTP dates", async () => {
    const responses = [
      new Response(null, {
        headers: { "retry-after": "999999999999999999999999" },
        status: 429,
      }),
      new Response(null, {
        headers: { "retry-after": "Wed, 19 Aug 2026 12:00:00 GMT" },
        status: 504,
      }),
    ]

    for (const response of responses) {
      await expect(
        deliverInvalidationOutboxEvent(event(), config, {
          fetchImpl: vi.fn(async () => response) as unknown as typeof fetch,
          now: () => Date.parse("2026-08-19T10:00:00.000Z"),
        })
      ).resolves.toEqual({
        errorCode: `http-${response.status}`,
        kind: "retry",
        retryAfterMs: 3_600_000,
      })
    }
  })

  it("retries a non-JSON or mismatched success acknowledgement", async () => {
    await expect(
      deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: vi.fn(async () =>
          Response.json({
            invalidatedTagCount: 2,
            outboxEventId: "different",
            replayed: false,
            schemaVersion: 1,
          })
        ) as unknown as typeof fetch,
      })
    ).resolves.toEqual({ errorCode: "invalid-ack", kind: "retry" })
    await expect(
      deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: vi.fn(
          async () => new Response("ok", { status: 200 })
        ) as unknown as typeof fetch,
      })
    ).resolves.toEqual({ errorCode: "invalid-ack", kind: "retry" })
  })

  it("bounds a success response before parsing it", async () => {
    await expect(
      deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: vi.fn(
          async () =>
            new Response(`{"padding":"${"x".repeat(9000)}"}`, {
              headers: { "content-type": "application/json" },
              status: 200,
            })
        ) as unknown as typeof fetch,
      })
    ).resolves.toEqual({ errorCode: "response-too-large", kind: "retry" })
  })

  it("retries network failures without leaking their error body", async () => {
    await expect(
      deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: vi.fn(() =>
          Promise.reject(new Error("secret response"))
        ) as unknown as typeof fetch,
      })
    ).resolves.toEqual({ errorCode: "network-error", kind: "retry" })
  })

  it("aborts a timed-out delivery and retries it", async () => {
    vi.useFakeTimers()
    try {
      const fetchImpl = vi.fn(
        async (_url: string | URL | Request, init?: RequestInit) =>
          await new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError"))
            )
          })
      )
      const pending = deliverInvalidationOutboxEvent(event(), config, {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
      await vi.advanceTimersByTimeAsync(5000)
      await expect(pending).resolves.toEqual({
        errorCode: "timeout",
        kind: "retry",
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it("permanently fails an invalid durable payload before HTTP", async () => {
    const fetchImpl = vi.fn()
    await expect(
      deliverInvalidationOutboxEvent(
        event({ tags: ["x".repeat(257)] }),
        config,
        { fetchImpl: fetchImpl as unknown as typeof fetch }
      )
    ).resolves.toEqual({
      errorCode: "invalid-outbox-payload",
      kind: "failed",
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })
})
