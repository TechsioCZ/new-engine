import { afterEach, describe, expect, it, vi } from "vitest"
import type { ClaimedUrlRegistryOutboxEvent } from "../../../modules/url-registry-outbox/delivery-state-contracts"
import {
  deliverUrlRegistryOutboxEvent,
  URL_REGISTRY_REQUEST_LIMIT_BYTES,
  URL_REGISTRY_REQUEST_TIMEOUT_MS,
  URL_REGISTRY_RESPONSE_LIMIT_BYTES,
} from "../delivery-client"

const TOKEN = "urlr-lifecycle-token-with-at-least-32-characters"
const ENDPOINT =
  "https://internal.test/api/internal/url-registry/product-lifecycle"

const claim = (
  overrides: Partial<ClaimedUrlRegistryOutboxEvent> = {}
): ClaimedUrlRegistryOutboxEvent => ({
  attemptCount: 1,
  changeType: "reconcile",
  claimToken: "claim-token-01",
  claimedAt: "2026-08-18T09:10:11.000Z",
  claimedBy: "worker-01",
  entityId: "prod_01",
  entityKind: "product",
  envelopeFingerprint: `sha256:${"a".repeat(64)}`,
  eventId: "business-event-01",
  id: "urlroe_outbox-row-01",
  leaseExpiresAt: "2026-08-18T09:10:41.000Z",
  marketCode: "sk",
  occurredAt: "2026-08-18T09:10:10.000Z",
  payload: {
    changeType: "reconcile",
    productId: "prod_01",
    reason: "updated",
    schemaVersion: 1,
  },
  source: "medusa",
  status: "processing",
  streamId: "urlros_stream-01",
  streamSequence: 3,
  ...overrides,
})

const acknowledgement = (
  event = claim(),
  overrides: Record<string, unknown> = {}
) => ({
  action: "noop-source-present",
  marketCode: event.marketCode,
  outboxEventId: event.id,
  outcome: "applied",
  replayed: false,
  schemaVersion: 1,
  streamSequence: event.streamSequence,
  ...overrides,
})

const jsonResponse = (body: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...headers },
    status,
  })

afterEach(() => {
  vi.useRealTimers()
})

describe("deliverUrlRegistryOutboxEvent", () => {
  it("maps the outbox row ID separately from the business event ID", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(acknowledgement()))

    const result = await deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      { fetchImpl }
    )

    expect(result).toEqual({ kind: "acknowledge", outcome: "applied" })
    expect(fetchImpl).toHaveBeenCalledOnce()
    const [url, init] = fetchImpl.mock.calls[0] ?? []
    expect(url).toBe(ENDPOINT)
    expect(init).toMatchObject({
      method: "POST",
      redirect: "error",
    })
    expect(new Headers(init?.headers).get("authorization")).toBe(
      `Bearer ${TOKEN}`
    )
    expect(JSON.parse(String(init?.body))).toEqual({
      schemaVersion: 1,
      outboxEventId: "urlroe_outbox-row-01",
      eventId: "business-event-01",
      envelopeFingerprint: `sha256:${"a".repeat(64)}`,
      source: "medusa",
      entityKind: "product",
      entityId: "prod_01",
      marketCode: "sk",
      streamSequence: 3,
      changeType: "reconcile",
      occurredAt: "2026-08-18T09:10:10.000Z",
      payload: {
        changeType: "reconcile",
        productId: "prod_01",
        reason: "updated",
        schemaVersion: 1,
      },
    })
  })

  it.each([
    [{ source: "payload" }, "source"],
    [{ entityKind: "category" }, "entity kind"],
  ])("fails an unsupported claimed %s before HTTP", async (overrides) => {
    const fetchImpl = vi.fn()

    const result = await deliverUrlRegistryOutboxEvent(
      claim(overrides),
      { endpoint: ENDPOINT, token: TOKEN },
      { fetchImpl }
    )

    expect(result).toEqual({
      errorCode: "unsupported-delivery-topic",
      kind: "fail",
    })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it("fails an oversized serialized request before HTTP", async () => {
    const fetchImpl = vi.fn()
    const event = claim({
      payload: { padding: "x".repeat(URL_REGISTRY_REQUEST_LIMIT_BYTES) },
    })

    const result = await deliverUrlRegistryOutboxEvent(
      event,
      { endpoint: ENDPOINT, token: TOKEN },
      { fetchImpl }
    )

    expect(result).toEqual({ errorCode: "request-too-large", kind: "fail" })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it.each([
    [400, "http-400"],
    [409, "http-409"],
    [413, "http-413"],
  ])("classifies HTTP %i as a permanent failure", async (status, errorCode) => {
    const result = await deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      { fetchImpl: vi.fn(async () => new Response("private", { status })) }
    )

    expect(result).toEqual({ errorCode, kind: "fail" })
  })

  it.each([
    401, 404, 408, 429, 500, 503, 302,
  ])("classifies HTTP %i as retryable", async (status) => {
    const result = await deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      { fetchImpl: vi.fn(async () => new Response(null, { status })) }
    )

    expect(result).toMatchObject({
      errorCode: `http-${status}`,
      kind: "retry",
    })
  })

  it("passes a bounded Retry-After hint to orchestration", async () => {
    const result = await deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      {
        fetchImpl: vi.fn(
          async () =>
            new Response(null, {
              headers: { "retry-after": "120" },
              status: 429,
            })
        ),
      }
    )

    expect(result).toEqual({
      errorCode: "http-429",
      kind: "retry",
      retryAfterMs: 120_000,
    })
  })

  it.each([
    ["outboxEventId", "urlroe_wrong"],
    ["marketCode", "cz"],
    ["streamSequence", 4],
    ["outcome", "unexpected"],
    ["replayed", true],
    ["extra", "field"],
  ])("retries an uncorrelated or invalid ACK field %s", async (key, value) => {
    const result = await deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      {
        fetchImpl: vi.fn(async () =>
          jsonResponse(acknowledgement(claim(), { [key]: value }))
        ),
      }
    )

    expect(result).toEqual({ errorCode: "invalid-ack", kind: "retry" })
  })

  it("rejects a response body beyond 16 KiB without buffering the rest", async () => {
    const oversized = JSON.stringify({
      padding: "x".repeat(URL_REGISTRY_RESPONSE_LIMIT_BYTES),
    })
    const result = await deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      { fetchImpl: vi.fn(async () => jsonResponse(oversized)) }
    )

    expect(result).toEqual({
      errorCode: "response-too-large",
      kind: "retry",
    })
  })

  it("aborts the complete request/response operation after five seconds", async () => {
    vi.useFakeTimers()
    const fetchImpl = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"))
          })
        })
    )

    const pending = deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      { fetchImpl }
    )
    await vi.advanceTimersByTimeAsync(URL_REGISTRY_REQUEST_TIMEOUT_MS)

    await expect(pending).resolves.toEqual({
      errorCode: "timeout",
      kind: "retry",
    })
  })

  it("retries a network or redirect rejection without exposing details", async () => {
    const result = await deliverUrlRegistryOutboxEvent(
      claim(),
      { endpoint: ENDPOINT, token: TOKEN },
      {
        fetchImpl: vi
          .fn()
          .mockRejectedValue(new Error("redirect to https://secret.invalid")),
      }
    )

    expect(result).toEqual({ errorCode: "network-error", kind: "retry" })
  })
})
