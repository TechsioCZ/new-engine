import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  getUrlRegistryRuntime: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/market/market-runtime", () => ({
  getMarketRuntime: () => ({ salesChannelId: "sc_ro" }),
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: () => ({}),
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

const TOKEN = "urlr-lifecycle-token-with-at-least-32-characters"
const delivery = Object.freeze({
  changeType: "reconcile",
  entityId: "pcat_1",
  entityKind: "category",
  envelopeFingerprint: `sha256:${"a".repeat(64)}`,
  eventId: "catalog-event-1",
  marketCode: "ro",
  occurredAt: "2026-08-20T10:00:00.000Z",
  outboxEventId: "urlroe_1",
  payload: {
    assignment: {
      publicationStatus: "published",
      publicSlug: "suplimente-nutritive",
      salesChannelId: "sc_ro",
    },
    changeType: "reconcile",
    entityId: "pcat_1",
    entityKind: "category",
    reason: "assignment-upsert",
    schemaVersion: 1,
    sourceVersion: "7",
  },
  schemaVersion: 1,
  source: "medusa",
  streamSequence: 1,
})

describe("catalog lifecycle route wiring", () => {
  beforeEach(() => {
    vi.stubEnv("URL_REGISTRY_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN", TOKEN)
    mocks.consume.mockReset().mockResolvedValue({
      action: "published",
      kind: "acknowledged",
      replayed: false,
    })
    mocks.getUrlRegistryRuntime.mockReset().mockResolvedValue({
      enabled: true,
      productLifecycleConsumer: { consume: mocks.consume },
    })
  })

  afterEach(() => vi.unstubAllEnvs())

  it("accepts a strict RO taxonomy delivery and forwards its actual kind", async () => {
    const { POST, runtime } = await import("./route")
    const response = await POST(
      new Request(
        "https://internal.test/api/internal/url-registry/catalog-lifecycle",
        {
          body: JSON.stringify(delivery),
          headers: {
            authorization: `Bearer ${TOKEN}`,
            "content-type": "application/json",
          },
          method: "POST",
        }
      )
    )

    expect(runtime).toBe("nodejs")
    expect(response.status).toBe(200)
    expect(mocks.consume).toHaveBeenCalledWith(delivery)
  })

  it("rejects product deliveries on the catalog endpoint", async () => {
    const { POST } = await import("./route")
    const response = await POST(
      new Request(
        "https://internal.test/api/internal/url-registry/catalog-lifecycle",
        {
          body: JSON.stringify({ ...delivery, entityKind: "product" }),
          headers: {
            authorization: `Bearer ${TOKEN}`,
            "content-type": "application/json",
          },
          method: "POST",
        }
      )
    )

    expect(response.status).toBe(400)
    expect(mocks.consume).not.toHaveBeenCalled()
  })
})
