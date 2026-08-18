import { describe, expect, it, vi } from "vitest"
import type {
  EntityUrlRoute,
  SourceReadResult,
  UrlEntitySlug,
  UrlRegistryResolution,
} from "@/lib/url-registry/contracts"
import {
  rawQueryFromRequestTarget,
  resolveProductPageRequest,
} from "./product-page"
import type {
  ProductRouteRegistry,
  ProductRouteSourceProduct,
} from "./product-route"

const timestamp = "2026-08-18T00:00:00.000Z"

const route: EntityUrlRoute = {
  id: "route-product-1",
  market: "sk",
  kind: "product",
  targetType: "entity",
  sourceSystem: "medusa",
  sourceType: "product",
  sourceId: "prod-1",
  staticRouteKey: null,
  equivalenceKey: "product:prod-1",
  indexPolicy: "indexable",
  status: "active",
  successorRouteId: null,
  version: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
}

const currentSlug: UrlEntitySlug = {
  id: "slug-current-product",
  market: "sk",
  kind: "product",
  normalizedSlug: "current-product",
  routeId: route.id,
  disposition: "current",
  normalizationVersion: 1,
  createdAt: timestamp,
}

const resolution: UrlRegistryResolution = {
  disposition: "current",
  route,
  matchedSlug: currentSlug,
  currentSlug,
}

const product: ProductRouteSourceProduct = {
  id: "prod-1",
  variants: [{ id: "variant-1", sku: "SKU-AbC-01" }],
}

const input = {
  enabled: true,
  headers: {
    canonicalOrigin: "https://herbatica.sk",
    market: "sk",
    publicPath: "/produkty/current-product",
    routeKey: "product.detail",
  },
  marketParam: "sk",
  rawQuery: "variant=SKU-AbC-01",
  slugParam: "current-product",
} as const

const dependencies = (
  registryResult: SourceReadResult<ProductRouteRegistry> = {
    kind: "found",
    value: {
      resolve: vi.fn().mockResolvedValue({ kind: "found", value: resolution }),
    },
  }
) => ({
  readProductById: vi.fn().mockResolvedValue({ kind: "found", value: product }),
  readRegistry: vi.fn().mockResolvedValue(registryResult),
})

describe("resolveProductPageRequest", () => {
  it("preserves the raw query sequence from the rewritten request target", () => {
    expect(
      rawQueryFromRequestTarget(
        "/~sf/sk/products/current-product?utm_source=x&variant=SKU-AbC-01"
      )
    ).toBe("utm_source=x&variant=SKU-AbC-01")
    expect(rawQueryFromRequestTarget("/~sf/sk/products/current-product")).toBe(
      ""
    )
  })

  it("resolves a trusted internal request through URLR and stable product ID", async () => {
    const deps = dependencies()

    const result = await resolveProductPageRequest(input, deps)

    expect(deps.readProductById).toHaveBeenCalledWith({
      market: "sk",
      productId: "prod-1",
    })
    expect(result).toEqual({
      kind: "found",
      value: {
        canonicalUrl: "https://herbatica.sk/produkty/current-product",
        initialVariantId: "variant-1",
        product,
        publicSlug: "current-product",
      },
    })
  })

  it.each([
    ["disabled", { ...input, enabled: false }],
    [
      "foreign market header",
      { ...input, headers: { ...input.headers, market: "cz" } },
    ],
    [
      "foreign origin header",
      {
        ...input,
        headers: { ...input.headers, canonicalOrigin: "https://herbatica.cz" },
      },
    ],
    [
      "wrong route key",
      { ...input, headers: { ...input.headers, routeKey: "m00.status" } },
    ],
    [
      "wrong public path",
      { ...input, headers: { ...input.headers, publicPath: "/p/legacy" } },
    ],
    ["array param", { ...input, slugParam: ["current-product"] }],
  ])("fails closed for %s internal context", async (_label, request) => {
    const deps = dependencies()

    await expect(resolveProductPageRequest(request, deps)).resolves.toEqual({
      kind: "not-found",
    })
    expect(deps.readRegistry).not.toHaveBeenCalled()
    expect(deps.readProductById).not.toHaveBeenCalled()
  })

  it.each([
    [{ kind: "missing" }, { kind: "unavailable" }],
    [
      { kind: "unavailable", retryAfterSeconds: 12 },
      { kind: "unavailable", retryAfterSeconds: 12 },
    ],
    [
      { kind: "invalid-response", causeCode: "MIGRATION_DRIFT" },
      { kind: "unavailable" },
    ],
  ] as const)("maps registry infrastructure outcome %# to an unavailable page", async (registryResult, expected) => {
    await expect(
      resolveProductPageRequest(input, dependencies(registryResult))
    ).resolves.toEqual(expected)
  })

  it("maps an unexpected adapter failure to unavailable", async () => {
    const deps = dependencies()
    deps.readRegistry.mockRejectedValueOnce(new Error("connection failed"))

    await expect(resolveProductPageRequest(input, deps)).resolves.toEqual({
      kind: "unavailable",
    })
  })
})
