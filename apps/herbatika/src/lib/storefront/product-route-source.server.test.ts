import { afterEach, describe, expect, it, vi } from "vitest"
import type { ProductRouteSourceMarketBinding } from "./product-route-source"

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

const binding: ProductRouteSourceMarketBinding = {
  countryCode: "SK",
  locale: "sk-SK",
  market: "sk",
  publishableApiKey: "pk_server_sk",
  regionId: "reg_sk",
  salesChannelId: "sc_sk",
}

const product = {
  handle: "backend-handle",
  id: "prod_1",
  metadata: {
    url_registry_publication: {
      markets: {
        sk: {
          publicationStatus: "published",
          publicSlug: "vitamin-c",
          salesChannelId: "sc_sk",
        },
      },
      schemaVersion: 1,
    },
  },
  title: "Vitamin C",
  variants: [],
}

describe("readProductRouteSourceFromMedusa", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("creates its server SDK with the trusted market key, never the global public key", async () => {
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "pk_global_untrusted")
    mocks.getMarketRuntime.mockReturnValue(binding)
    mocks.fetch.mockImplementation(async (path: string) =>
      path.includes("/url-registry/products/")
        ? {
            entityId: "prod_1",
            marketCode: "sk",
            publicSlug: "vitamin-c",
            salesChannelId: "sc_sk",
            sourceVersion: "2026-08-19T00:00:00.000Z",
            translation: {
              localeCode: "sk-SK",
              reference: "product",
              translationId: "trans_1",
            },
          }
        : { product }
    )
    mocks.createMedusaSdk.mockReturnValue({ client: { fetch: mocks.fetch } })
    const { readProductRouteSourceFromMedusa } = await import(
      "./product-route-source.server"
    )

    const result = await readProductRouteSourceFromMedusa({
      market: "sk",
      productId: "prod_1",
      publicSlug: "vitamin-c",
    })

    expect(result).toEqual({ kind: "found", value: product })
    expect(mocks.createMedusaSdk).toHaveBeenCalledWith({
      baseUrl: "https://medusa.internal",
      publishableKey: "pk_server_sk",
    })
    expect(mocks.createMedusaSdk).not.toHaveBeenCalledWith(
      expect.objectContaining({ publishableKey: "pk_global_untrusted" })
    )
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/store/url-registry/products/prod_1/source",
      expect.objectContaining({ query: { market: "sk" } })
    )
  })
})
