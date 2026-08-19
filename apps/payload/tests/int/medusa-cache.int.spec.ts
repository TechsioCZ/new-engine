import type { PayloadRequest } from "payload"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/utils/env", () => ({
  getEnvString: vi.fn(),
}))

vi.mock("@/lib/utils/request", () => ({
  createRequestTimeout: vi.fn(() => ({
    controller: new AbortController(),
    clearTimeout: vi.fn(),
  })),
}))

const logger = { error: vi.fn(), info: vi.fn(), warn: vi.fn() }
const OUTBOX_EVENT_ID_PATTERN = /^payload-cms-v1:[a-f0-9]{64}$/
const HMAC_PATTERN = /^[a-f0-9]{64}$/

const request = () => {
  const queue = vi.fn().mockResolvedValue({ id: 1 })
  const req = {
    locale: "cs",
    payload: { jobs: { queue }, logger },
  } as unknown as PayloadRequest
  return { queue, req }
}

describe("Medusa CMS invalidation outbox", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.clearAllMocks()
    globalThis.fetch = vi.fn() as unknown as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("enqueues an update atomically with the originating Payload request", async () => {
    const { createMedusaCacheHook } = await import("@/lib/hooks/medusa-cache")
    const { queue, req } = request()
    const doc = {
      id: 42,
      slug: { cs: "novinky", sk: "novinky-sk" },
      status: "published",
      updatedAt: "2026-08-19T00:00:00.000Z",
    }

    await createMedusaCacheHook("articles")({
      doc,
      operation: "update",
      req,
    } as never)

    expect(globalThis.fetch).not.toHaveBeenCalled()
    expect(queue).toHaveBeenCalledOnce()
    expect(queue).toHaveBeenCalledWith({
      input: expect.objectContaining({
        collection: "articles",
        doc: expect.objectContaining({
          id: "42",
          locale: "cs",
          slug: "novinky",
          status: "published",
        }),
        eventId: expect.stringMatching(OUTBOX_EVENT_ID_PATTERN),
        operation: "update",
        sourceVersion: "2026-08-19T00:00:00.000Z",
      }),
      queue: "cms-outbox",
      req,
      task: "deliver-medusa-cms-invalidation",
    })
  })

  it("creates the same replay key for the same source version", async () => {
    const { createMedusaCacheHook } = await import("@/lib/hooks/medusa-cache")
    const hook = createMedusaCacheHook("pages")
    const doc = { id: 7, slug: "privacy", updatedAt: "v7" }
    const first = request()
    const second = request()

    await hook({ doc, operation: "update", req: first.req } as never)
    await hook({ doc, operation: "update", req: second.req } as never)

    expect(first.queue.mock.calls[0]?.[0].input.eventId).toBe(
      second.queue.mock.calls[0]?.[0].input.eventId
    )
  })

  it("omits locale from delete events", async () => {
    const { createMedusaCacheHook } = await import("@/lib/hooks/medusa-cache")
    const { queue, req } = request()

    await createMedusaCacheHook("pages")({
      doc: { id: 7, slug: "privacy", updatedAt: "v7" },
      operation: "delete",
      req,
    } as never)

    expect(queue.mock.calls[0]?.[0].input.doc.locale).toBeUndefined()
  })

  it("does not enqueue unsupported operations", async () => {
    const { createMedusaCacheHook } = await import("@/lib/hooks/medusa-cache")
    const { queue, req } = request()

    await createMedusaCacheHook("pages")({
      doc: { id: 7 },
      operation: "read",
      req,
    } as never)

    expect(queue).not.toHaveBeenCalled()
  })

  it("refuses to enqueue outside the mutation transaction", async () => {
    const { createMedusaCacheHook } = await import("@/lib/hooks/medusa-cache")

    await expect(
      createMedusaCacheHook("pages")({
        doc: { id: 7 },
        operation: "update",
        req: null,
      } as never)
    ).rejects.toThrow("Payload request is required")
  })

  it("delivers a signed event with its idempotency key", async () => {
    const { getEnvString } = await import("@/lib/utils/env")
    vi.mocked(getEnvString)
      .mockReturnValueOnce("http://medusa.test/")
      .mockReturnValueOnce("test-secret")
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response(null, { status: 204 })
    )
    const { deliverMedusaCmsInvalidation } = await import(
      "@/lib/jobs/medusa-cms-invalidation"
    )
    const input = {
      collection: "pages",
      doc: { id: "7", locale: "cs" },
      eventId: `payload-cms-v1:${"a".repeat(64)}`,
      occurredAt: "2026-08-19T00:00:00.000Z",
      operation: "update",
      sourceVersion: "v7",
    }

    await deliverMedusaCmsInvalidation(input)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://medusa.test/hooks/cms/invalidate",
      expect.objectContaining({
        body: JSON.stringify(input),
        headers: expect.objectContaining({
          "x-payload-event-id": input.eventId,
          "x-payload-signature": expect.stringMatching(HMAC_PATTERN),
        }),
        method: "POST",
      })
    )
  })

  it("keeps delivery retryable when configuration or Medusa is unavailable", async () => {
    const { getEnvString } = await import("@/lib/utils/env")
    const { deliverMedusaCmsInvalidation } = await import(
      "@/lib/jobs/medusa-cms-invalidation"
    )
    const input = {
      collection: "pages",
      doc: {},
      eventId: "event",
      occurredAt: "2026-08-19T00:00:00.000Z",
      operation: "update",
      sourceVersion: "v1",
    }

    vi.mocked(getEnvString).mockReturnValueOnce(null)
    await expect(deliverMedusaCmsInvalidation(input)).rejects.toThrow(
      "MEDUSA_BACKEND_URL"
    )

    vi.mocked(getEnvString)
      .mockReturnValueOnce("http://medusa.test")
      .mockReturnValueOnce("test-secret")
    vi.mocked(globalThis.fetch).mockResolvedValue(
      new Response("upstream failed", { status: 503 })
    )
    await expect(deliverMedusaCmsInvalidation(input)).rejects.toThrow(
      "delivery failed (503)"
    )
  })
})
