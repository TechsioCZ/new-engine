import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const binding = {
    countryCode: "SK",
    locale: "sk-SK",
    market: "sk",
    publishableApiKey: "pk_sk",
    regionId: "reg_sk",
    salesChannelId: "sc_sk",
  } as const
  return {
    binding,
    sdk: { client: { fetch: vi.fn() } },
  }
})

vi.mock("@techsio/storefront-data/shared/medusa-client", () => ({
  createMedusaSdk: vi.fn(() => mocks.sdk),
}))

vi.mock("@/lib/market/market-runtime", () => ({
  getMarketRuntime: vi.fn((_runtime, market) =>
    market === "sk" ? mocks.binding : null
  ),
}))

vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: vi.fn(() => ({ bindings: [mocks.binding] })),
}))

vi.mock("./runtime-env", () => ({
  resolveMedusaBackendUrl: vi.fn(() => "https://medusa.example.test"),
}))

import { readCollectionIndexSourceFromMedusa } from "./collections-index-source.server"

describe("readCollectionIndexSourceFromMedusa", () => {
  beforeEach(() => {
    mocks.sdk.client.fetch.mockReset()
    mocks.sdk.client.fetch.mockImplementation((path: string) => {
      if (path.endsWith("/assignments")) {
        return Promise.resolve({
          count: 1,
          items: [
            {
              entityId: "pcol_1",
              id: "pcol_1",
              marketCode: "sk",
              publicationStatus: "published",
              publicSlug: "zimna-kolekcia",
              salesChannelId: "sc_sk",
              schemaVersion: 1,
              sourceVersion: "v1",
            },
          ],
          limit: 100,
          offset: 0,
        })
      }
      return Promise.resolve({
        collections: [{ id: "pcol_1", title: "Zimná kolekcia" }],
        count: 1,
      })
    })
  })

  it("uses the bounded assignment list and stable-ID collection batch endpoints", async () => {
    await expect(
      readCollectionIndexSourceFromMedusa({
        market: "sk",
        routeSourceIds: ["pcol_1"],
      })
    ).resolves.toEqual({
      kind: "found",
      value: [{ id: "pcol_1", title: "Zimná kolekcia" }],
    })

    expect(mocks.sdk.client.fetch).toHaveBeenCalledWith(
      "/store/url-registry/collections/assignments",
      {
        query: { limit: 100, offset: 0 },
        signal: expect.any(AbortSignal),
      }
    )
    expect(mocks.sdk.client.fetch).toHaveBeenCalledWith("/store/collections", {
      query: { id: ["pcol_1"], limit: 1 },
      signal: expect.any(AbortSignal),
    })
  })
})
