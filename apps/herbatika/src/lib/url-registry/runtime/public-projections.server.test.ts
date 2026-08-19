import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  findActiveEntityRoute: vi.fn(),
  getUrlRegistryRuntime: vi.fn(),
  listActiveEntityRoutes: vi.fn(),
}))

vi.mock("./instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

import { listPublicEntityProjections } from "./public-projections.server"

describe("targeted public entity projection reads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findActiveEntityRoute.mockResolvedValue({ kind: "missing" })
    mocks.getUrlRegistryRuntime.mockResolvedValue({
      enabled: true,
      registry: {
        findActiveEntityRoute: mocks.findActiveEntityRoute,
        listActiveEntityRoutes: mocks.listActiveEntityRoutes,
      },
    })
  })

  it("resolves only unique required stable source IDs", async () => {
    await expect(
      listPublicEntityProjections({
        kind: "product",
        market: "sk",
        requiredSourceIds: ["prod-1", "prod-1", ""],
      })
    ).resolves.toEqual({ kind: "found", value: [] })

    expect(mocks.findActiveEntityRoute).toHaveBeenCalledTimes(1)
    expect(mocks.findActiveEntityRoute).toHaveBeenCalledWith({
      market: "sk",
      sourceId: "prod-1",
      sourceSystem: "medusa",
      sourceType: "product",
      staticRouteKey: null,
      targetType: "entity",
    })
    expect(mocks.listActiveEntityRoutes).not.toHaveBeenCalled()
  })

  it("rejects oversized targeted reads before touching the registry", async () => {
    await expect(
      listPublicEntityProjections({
        kind: "product",
        market: "sk",
        requiredSourceIds: Array.from(
          { length: 101 },
          (_, index) => `prod-${index}`
        ),
      })
    ).resolves.toEqual({
      causeCode: "REQUIRED_PUBLIC_PROJECTION_LIMIT_EXCEEDED",
      kind: "invalid-response",
    })

    expect(mocks.getUrlRegistryRuntime).not.toHaveBeenCalled()
  })
})
