import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  countActiveEntityRoutes: vi.fn(),
  findActiveEntityRoute: vi.fn(),
  getUrlRegistryRuntime: vi.fn(),
  listActiveEntityRoutes: vi.fn(),
}))

vi.mock("./instance.server", () => ({
  getUrlRegistryRuntime: mocks.getUrlRegistryRuntime,
}))

import {
  countPublicIndexableEntityProjections,
  listPublicEntityProjections,
  listPublicIndexableEntityProjectionPage,
} from "./public-projections.server"

describe("targeted public entity projection reads", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findActiveEntityRoute.mockResolvedValue({ kind: "missing" })
    mocks.getUrlRegistryRuntime.mockResolvedValue({
      enabled: true,
      registry: {
        countActiveEntityRoutes: mocks.countActiveEntityRoutes,
        findActiveEntityRoute: mocks.findActiveEntityRoute,
        listActiveEntityRoutes: mocks.listActiveEntityRoutes,
      },
    })
  })

  it("counts indexable routes without scanning projection pages", async () => {
    mocks.countActiveEntityRoutes.mockResolvedValue({
      kind: "found",
      value: 20_000,
    })

    await expect(
      countPublicIndexableEntityProjections({
        kind: "product",
        market: "sk",
      })
    ).resolves.toEqual({ kind: "found", value: 20_000 })

    expect(mocks.countActiveEntityRoutes).toHaveBeenCalledTimes(1)
    expect(mocks.countActiveEntityRoutes).toHaveBeenCalledWith({
      indexPolicy: "indexable",
      kind: "product",
      market: "sk",
    })
    expect(mocks.listActiveEntityRoutes).not.toHaveBeenCalled()
  })

  it("loads one exact bounded indexable projection page", async () => {
    mocks.listActiveEntityRoutes.mockResolvedValue({
      kind: "found",
      value: { items: [], nextCursor: null },
    })

    await expect(
      listPublicIndexableEntityProjectionPage({
        kind: "product",
        limit: 100,
        market: "sk",
        offset: 19_900,
      })
    ).resolves.toEqual({ kind: "found", value: [] })

    expect(mocks.listActiveEntityRoutes).toHaveBeenCalledTimes(1)
    expect(mocks.listActiveEntityRoutes).toHaveBeenCalledWith({
      indexPolicy: "indexable",
      kind: "product",
      limit: 100,
      market: "sk",
      offset: 19_900,
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

  it("bounds concurrent registry reads below the runtime pool size", async () => {
    let activeReads = 0
    let maximumActiveReads = 0
    mocks.findActiveEntityRoute.mockImplementation(async () => {
      activeReads += 1
      maximumActiveReads = Math.max(maximumActiveReads, activeReads)
      await Promise.resolve()
      activeReads -= 1
      return { kind: "missing" }
    })

    await expect(
      listPublicEntityProjections({
        kind: "product",
        market: "sk",
        requiredSourceIds: Array.from(
          { length: 12 },
          (_, index) => `prod-${index}`
        ),
      })
    ).resolves.toEqual({ kind: "found", value: [] })

    expect(maximumActiveReads).toBe(5)
    expect(mocks.findActiveEntityRoute).toHaveBeenCalledTimes(12)
  })
})
