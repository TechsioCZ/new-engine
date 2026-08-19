import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  consume: vi.fn(),
  getConfiguredMarketRuntime: vi.fn(),
  resolveMarketRuntimeByHost: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/market/market-runtime", () => ({
  resolveMarketRuntimeByHost: mocks.resolveMarketRuntimeByHost,
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: mocks.getConfiguredMarketRuntime,
}))
vi.mock("@/lib/url-registry/runtime/invalidation.server", () => ({
  consumeUrlRegistryInvalidation: mocks.consume,
}))

const TOKEN = "urlr-invalidation-token-with-at-least-32-characters"
const delivery = {
  outboxEventId: "1001",
  schemaVersion: 1,
  tags: ["market:sk", "sitemap:sk"],
}
const request = (host = "herbatica.sk") =>
  new Request("https://herbatica.sk/api/url-registry/invalidate", {
    body: JSON.stringify(delivery),
    headers: {
      authorization: `Bearer ${TOKEN}`,
      "content-type": "application/json",
      host,
    },
    method: "POST",
  })

describe("URL registry invalidation route wiring", () => {
  beforeEach(() => {
    vi.stubEnv("URL_REGISTRY_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_INVALIDATION_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_INVALIDATION_TOKEN", TOKEN)
    mocks.consume.mockReset().mockResolvedValue({
      invalidatedTagCount: 2,
      outboxEventId: "1001",
      replayed: false,
      schemaVersion: 1,
    })
    mocks.getConfiguredMarketRuntime.mockReset().mockReturnValue({})
    mocks.resolveMarketRuntimeByHost
      .mockReset()
      .mockImplementation((_runtime, host) =>
        host === "herbatica.sk" ? { market: "sk" } : null
      )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("uses the configured host authority and dedicated token", async () => {
    const { POST, runtime } = await import("./route")

    const response = await POST(request())

    expect(runtime).toBe("nodejs")
    expect(response.status).toBe(200)
    expect(mocks.resolveMarketRuntimeByHost).toHaveBeenCalledWith(
      expect.anything(),
      "herbatica.sk"
    )
    expect(mocks.consume).toHaveBeenCalledWith(delivery)
  })

  it.each([
    ["0", "1"],
    ["1", "0"],
  ])("stays hidden unless both gates are enabled (%s/%s)", async (registry, invalidation) => {
    vi.stubEnv("URL_REGISTRY_ENABLED", registry)
    vi.stubEnv("URL_REGISTRY_INVALIDATION_ENABLED", invalidation)
    const { POST } = await import("./route")

    const response = await POST(request())

    expect(response.status).toBe(404)
    expect(mocks.consume).not.toHaveBeenCalled()
  })

  it("rejects an unknown Host before consuming", async () => {
    const { POST } = await import("./route")

    const response = await POST(request("unknown.example"))

    expect(response.status).toBe(421)
    expect(mocks.consume).not.toHaveBeenCalled()
  })
})
