import { describe, expect, it, vi } from "vitest"
import type { ProductLifecycleReceiptAction } from "../product-lifecycle"
import { handleProductLifecycleRequest } from "./product-lifecycle-endpoint"

const TOKEN = "urlr-lifecycle-token-with-at-least-32-characters"
const SHA = `sha256:${"a".repeat(64)}`

const delivery = () => ({
  schemaVersion: 1,
  outboxEventId: "urlroe_01",
  eventId: "event_01",
  envelopeFingerprint: SHA,
  source: "medusa",
  entityKind: "product",
  entityId: "prod_01",
  marketCode: "sk",
  streamSequence: 1,
  changeType: "reconcile",
  occurredAt: "2026-08-18T09:10:11.123Z",
  payload: {
    schemaVersion: 1,
    productId: "prod_01",
    reason: "updated",
    changeType: "reconcile",
  },
})

const request = (
  body: unknown = delivery(),
  options: Readonly<{
    authorization?: string
    contentType?: string
  }> = {}
) =>
  new Request(
    "https://internal.test/api/internal/url-registry/product-lifecycle",
    {
      body: JSON.stringify(body),
      headers: {
        authorization: options.authorization ?? `Bearer ${TOKEN}`,
        "content-type": options.contentType ?? "application/json",
      },
      method: "POST",
    }
  )

const dependencies = (
  consume = vi.fn().mockResolvedValue({
    kind: "acknowledged",
    action: "noop-source-present",
    replayed: false,
  })
) => ({
  consume,
  enabled: true,
  lifecycleToken: TOKEN,
})

const privateHeaders = (response: Response) => ({
  cacheControl: response.headers.get("cache-control"),
  robots: response.headers.get("x-robots-tag"),
})

const PRIVATE_HEADERS = {
  cacheControl: "private, no-store, max-age=0",
  robots: "noindex, nofollow",
}

describe("handleProductLifecycleRequest", () => {
  it("stays hidden while disabled without reading the request body", async () => {
    const consume = vi.fn()
    const lifecycleRequest = request()

    const response = await handleProductLifecycleRequest(lifecycleRequest, {
      consume,
      enabled: false,
      lifecycleToken: TOKEN,
    })

    expect(response.status).toBe(404)
    expect(lifecycleRequest.bodyUsed).toBe(false)
    expect(consume).not.toHaveBeenCalled()
    expect(privateHeaders(response)).toEqual(PRIVATE_HEADERS)
  })

  it("authenticates before reading the body", async () => {
    const consume = vi.fn()
    const lifecycleRequest = request(delivery(), {
      authorization: "Bearer wrong-token",
    })

    const response = await handleProductLifecycleRequest(lifecycleRequest, {
      consume,
      enabled: true,
      lifecycleToken: TOKEN,
    })

    expect(response.status).toBe(401)
    expect(response.headers.get("www-authenticate")).toBe("Bearer")
    expect(lifecycleRequest.bodyUsed).toBe(false)
    expect(consume).not.toHaveBeenCalled()
  })

  it("fails closed when the lifecycle token is missing or malformed", async () => {
    const consume = vi.fn()
    const response = await handleProductLifecycleRequest(request(), {
      consume,
      enabled: true,
      lifecycleToken: "short",
    })

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("5")
    expect(await response.json()).toEqual({ error: "service-unavailable" })
    expect(consume).not.toHaveBeenCalled()
  })

  it.each([
    ["text/plain", delivery()],
    ["application/jsonp", delivery()],
    ["application/json", null],
    ["application/json", { ...delivery(), schemaVersion: 2 }],
  ])("rejects an invalid delivery boundary", async (contentType, body) => {
    const deps = dependencies()
    const response = await handleProductLifecycleRequest(
      request(body, { contentType }),
      deps
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: "invalid-delivery" })
    expect(deps.consume).not.toHaveBeenCalled()
  })

  it("stops an oversized streamed body at 64 KiB", async () => {
    const cancel = vi.fn()
    const lifecycleRequest = new Request(
      "https://internal.test/api/internal/url-registry/product-lifecycle",
      {
        body: new ReadableStream({
          cancel,
          start(controller) {
            controller.enqueue(new Uint8Array(64 * 1024))
            controller.enqueue(new Uint8Array([1]))
          },
        }),
        duplex: "half",
        headers: {
          authorization: `Bearer ${TOKEN}`,
          "content-type": "application/json",
        },
        method: "POST",
      } as RequestInit & { duplex: "half" }
    )
    const deps = dependencies()

    const response = await handleProductLifecycleRequest(lifecycleRequest, deps)

    expect(response.status).toBe(413)
    expect(cancel).toHaveBeenCalledOnce()
    expect(deps.consume).not.toHaveBeenCalled()
  })

  it.each([
    ["noop-source-present", false, "applied"],
    ["requires-publication", false, "applied"],
    ["retired", true, "already-applied"],
  ] as const)("acknowledges %s with replay=%s", async (action, replayed, outcome) => {
    const consume = vi.fn().mockResolvedValue({
      kind: "acknowledged",
      action: action as ProductLifecycleReceiptAction,
      replayed,
    })
    const response = await handleProductLifecycleRequest(
      request(),
      dependencies(consume)
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      schemaVersion: 1,
      outcome,
      action,
      replayed,
      outboxEventId: "urlroe_01",
      marketCode: "sk",
      streamSequence: 1,
    })
    expect(consume).toHaveBeenCalledWith(delivery())
    expect(privateHeaders(response)).toEqual(PRIVATE_HEADERS)
  })

  it.each([
    ["source-unavailable", 5],
    ["source-invalid-response", 5],
    ["route-unavailable", 5],
    ["route-invalid-response", 5],
    ["source-event-gap", 17],
  ] as const)("maps retryable %s to a bounded 503", async (code, retryAfter) => {
    const consume = vi.fn().mockResolvedValue({
      kind: "retry",
      action: null,
      cause: code,
      ...(retryAfter === 5 ? {} : { retryAfterSeconds: retryAfter }),
    })
    const response = await handleProductLifecycleRequest(
      request(),
      dependencies(consume)
    )

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe(String(retryAfter))
    expect(await response.json()).toEqual({ error: code })
    expect(privateHeaders(response)).toEqual(PRIVATE_HEADERS)
  })

  it.each([
    "live-source-has-terminal-route",
  ] as const)("maps permanent %s to 409", async (cause) => {
    const consume = vi
      .fn()
      .mockResolvedValue({ kind: "conflict", action: null, cause })
    const response = await handleProductLifecycleRequest(
      request(),
      dependencies(consume)
    )

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: cause })
    expect(privateHeaders(response)).toEqual(PRIVATE_HEADERS)
  })

  it.each([
    ["SEQUENCE_GAP", 503, "source-event-gap"],
    ["DELIVERY_DRIFT", 409, "source-event-conflict"],
    ["STALE_DELIVERY", 409, "source-event-conflict"],
  ] as const)("redacts and maps consumer ordering error %s", async (code, status, publicCode) => {
    const consume = vi.fn().mockRejectedValue(
      Object.assign(new Error("private ordering details"), {
        code,
        name: "ProductLifecycleConsumerError",
      })
    )
    const response = await handleProductLifecycleRequest(
      request(),
      dependencies(consume)
    )

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual({ error: publicCode })
    expect(response.headers.get("retry-after")).toBe(
      status === 503 ? "5" : null
    )
  })

  it("redacts unexpected consumer failures", async () => {
    const consume = vi
      .fn()
      .mockRejectedValue(new Error("postgresql://private:secret@database"))
    const response = await handleProductLifecycleRequest(
      request(),
      dependencies(consume)
    )

    expect(response.status).toBe(503)
    expect(response.headers.get("retry-after")).toBe("5")
    const body = await response.text()
    expect(body).toBe('{"error":"service-unavailable"}')
    expect(body).not.toContain("private")
    expect(privateHeaders(response)).toEqual(PRIVATE_HEADERS)
  })
})
