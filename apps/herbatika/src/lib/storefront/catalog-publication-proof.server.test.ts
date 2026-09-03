import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createMedusaSdk: vi.fn(),
  fetch: vi.fn(),
  getMarketRuntime: vi.fn(),
}))

vi.mock("@techsio/storefront-data/shared/medusa-client", () => ({
  createMedusaSdk: mocks.createMedusaSdk,
}))
vi.mock("@/lib/market/market-runtime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/market-runtime")>()),
  getMarketRuntime: mocks.getMarketRuntime,
}))
vi.mock("@/lib/market/market-runtime.server", () => ({
  getConfiguredMarketRuntime: vi.fn(() => ({ bindings: {} })),
}))
vi.mock("./runtime-env", () => ({
  resolveMedusaBackendUrl: vi.fn(() => "https://medusa.internal"),
}))

const binding = {
  locale: "cs-CZ",
  market: "cz" as const,
  publishableApiKey: "pk_cz",
  salesChannelId: "sc_cz",
}

describe("readCatalogPublicationProofFromMedusa", () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.getMarketRuntime.mockReturnValue(binding)
    mocks.fetch.mockResolvedValue({
      assignments: [
        {
          entityId: "category_1",
          id: "category_1",
          marketCode: "cz",
          publicationStatus: "published",
          publicSlug: "vitaminy",
          salesChannelId: "sc_cz",
          schemaVersion: 1,
          sourceVersion: "7",
          translation: {
            localeCode: "cs-CZ",
            reference: "product_category",
            translationId: "translation_1",
          },
        },
      ],
      entityKind: "category",
      marketCode: "cz",
      schemaVersion: 1,
    })
    mocks.createMedusaSdk.mockReturnValue({ client: { fetch: mocks.fetch } })
  })

  it("posts the exact audited route candidate through the market SDK", async () => {
    const { readCatalogPublicationProofFromMedusa } = await import(
      "./catalog-publication-proof.server"
    )

    await expect(
      readCatalogPublicationProofFromMedusa({
        entityId: "category_1",
        entityKind: "category",
        market: "cz",
        publicSlug: "vitaminy",
        sourceVersion: "7",
      })
    ).resolves.toMatchObject({ kind: "found" })
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/store/url-registry/catalog/sources",
      expect.objectContaining({
        body: {
          candidates: [
            {
              entityId: "category_1",
              publicSlug: "vitaminy",
              sourceVersion: "7",
            },
          ],
          entityKind: "category",
          market: "cz",
          schemaVersion: 1,
        },
        method: "POST",
      })
    )
  })
})
