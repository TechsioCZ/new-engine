import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUrlRegistryRuntime: vi.fn(),
  handle: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/url-registry/http/content-projection-endpoint", () => ({
  handleContentProjectionRequest: mocks.handle,
}))
vi.mock("@/lib/url-registry/runtime/instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

import { POST, runtime } from "./route"

const TOKEN = "urlr-content-projection-token-at-least-32-characters"
const request = new Request(
  "http://herbatika:3000/api/internal/url-registry/content-projections",
  { method: "POST" }
)

describe("URL registry content projection route wiring", () => {
  beforeEach(() => {
    vi.stubEnv("URL_REGISTRY_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_CONTENT_PROJECTION_ENABLED", "1")
    vi.stubEnv("URL_REGISTRY_CONTENT_PROJECTION_TOKEN", TOKEN)
    mocks.handle
      .mockReset()
      .mockResolvedValue(new Response(null, { status: 204 }))
    mocks.getUrlRegistryRuntime.mockReset().mockResolvedValue({
      enabled: true,
      registry: { marker: "registry" },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("passes only the dedicated gates, token, and URLR read port", async () => {
    const response = await POST(request)

    expect(runtime).toBe("nodejs")
    expect(response.status).toBe(204)
    expect(mocks.handle).toHaveBeenCalledOnce()
    const dependencies = mocks.handle.mock.calls[0]?.[1]
    expect(dependencies).toMatchObject({
      enabled: true,
      projectionToken: TOKEN,
    })
    await expect(dependencies.readRegistry()).resolves.toEqual({
      marker: "registry",
    })
  })

  it.each([
    ["0", "1"],
    ["1", "0"],
  ])("stays disabled unless both gates are enabled (%s/%s)", async (registry, projection) => {
    vi.stubEnv("URL_REGISTRY_ENABLED", registry)
    vi.stubEnv("URL_REGISTRY_CONTENT_PROJECTION_ENABLED", projection)

    await POST(request)

    expect(mocks.handle.mock.calls[0]?.[1]).toMatchObject({ enabled: false })
  })
})
