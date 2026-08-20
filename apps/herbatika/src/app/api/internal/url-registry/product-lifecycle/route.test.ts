import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  getUrlRegistryRuntime: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/market/market-runtime", () => ({
  getMarketRuntime: () => ({ salesChannelId: "sc_sk" }),
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: () => ({}),
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

const TOKEN = "urlr-lifecycle-token-with-at-least-32-characters"
const delivery = Object.freeze({
  schemaVersion: 1,
  outboxEventId: "urlroe_01",
  eventId: "event_01",
  envelopeFingerprint: `sha256:${"a".repeat(64)}`,
  source: "medusa",
  entityKind: "product",
  entityId: "prod_01",
  marketCode: "sk",
  streamSequence: 1,
  changeType: "reconcile",
  occurredAt: "2026-08-18T09:10:11.123Z",
  payload: {
    assignment: {
      publicationStatus: "published",
      publicSlug: "produkt-01",
      salesChannelId: "sc_sk",
    },
    schemaVersion: 1,
    productId: "prod_01",
    reason: "updated",
    changeType: "reconcile",
    sourceVersion: "2026-08-18T09:00:00.000Z",
  },
})

const request = (authorization = `Bearer ${TOKEN}`) =>
  new Request(
    "https://herbatica.cz/api/internal/url-registry/product-lifecycle",
    {
      body: JSON.stringify(delivery),
      headers: {
        authorization,
        "content-type": "application/json",
        host: "herbatica.cz",
      },
      method: "POST",
    }
  )

describe("product lifecycle route wiring", () => {
  beforeEach(() => {
    vi.stubEnv("URL_REGISTRY_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_PRODUCT_LIFECYCLE_TOKEN", TOKEN)
    vi.stubEnv(
      "URL_REGISTRY_ADMIN_TOKEN",
      "admin-token-with-at-least-32-characters"
    )
    mocks.consume.mockReset().mockResolvedValue({
      kind: "acknowledged",
      action: "noop-source-present",
      replayed: false,
    })
    mocks.getUrlRegistryRuntime.mockReset().mockResolvedValue({
      close: vi.fn(),
      enabled: true,
      productLifecycleConsumer: { consume: mocks.consume },
      registry: {},
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses the SK delivery market even when the request Host belongs to CZ", async () => {
    const { POST, runtime } = await import("./route")

    const response = await POST(request())

    expect(runtime).toBe("nodejs")
    expect(response.status).toBe(200)
    expect(mocks.getUrlRegistryRuntime).toHaveBeenCalledOnce()
    expect(mocks.consume).toHaveBeenCalledWith(delivery)
  })

  it.each([
    ["0", "1"],
    ["1", "0"],
  ])("stays hidden unless both feature gates are enabled (%s/%s)", async (registryEnabled, lifecycleEnabled) => {
    vi.stubEnv("URL_REGISTRY_ENABLED", registryEnabled)
    vi.stubEnv("URL_REGISTRY_PRODUCT_LIFECYCLE_ENABLED", lifecycleEnabled)
    const { POST } = await import("./route")

    const response = await POST(request())

    expect(response.status).toBe(404)
    expect(mocks.getUrlRegistryRuntime).not.toHaveBeenCalled()
  })

  it("accepts only the dedicated lifecycle token", async () => {
    const { POST } = await import("./route")

    const response = await POST(
      request("Bearer admin-token-with-at-least-32-characters")
    )

    expect(response.status).toBe(401)
    expect(mocks.getUrlRegistryRuntime).not.toHaveBeenCalled()
  })
})
