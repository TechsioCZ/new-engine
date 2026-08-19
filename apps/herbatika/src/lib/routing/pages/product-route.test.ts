import { describe, expect, it, vi } from "vitest"
import type {
  EntityUrlRoute,
  SourceReadResult,
  UrlEntitySlug,
  UrlRegistryResolution,
} from "@/lib/url-registry/contracts"
import {
  type ProductRouteRegistry,
  type ProductRouteSourceProduct,
  resolveProductRoute,
} from "./product-route"

const timestamp = "2026-08-18T00:00:00.000Z"

const route = (
  sourceId: string,
  overrides: Partial<EntityUrlRoute> = {}
): EntityUrlRoute => ({
  id: `route-${sourceId}`,
  market: "sk",
  kind: "product",
  targetType: "entity",
  sourceSystem: "medusa",
  sourceType: "product",
  sourceId,
  staticRouteKey: null,
  equivalenceKey: `product:${sourceId}`,
  indexPolicy: "indexable",
  status: "active",
  successorRouteId: null,
  version: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  ...overrides,
})

const slug = (
  normalizedSlug: string,
  routeId: string | null,
  disposition: UrlEntitySlug["disposition"]
): UrlEntitySlug => ({
  id: `slug-${normalizedSlug}`,
  market: "sk",
  kind: "product",
  normalizedSlug,
  routeId,
  disposition,
  normalizationVersion: 1,
  createdAt: timestamp,
})

const currentResolution = (
  sourceId = "prod-1",
  normalizedSlug = "current-product"
): UrlRegistryResolution => {
  const currentRoute = route(sourceId)
  const currentSlug = slug(normalizedSlug, currentRoute.id, "current")
  return {
    disposition: "current",
    route: currentRoute,
    matchedSlug: currentSlug,
    currentSlug,
  }
}

const sourceProduct = (id = "prod-1"): ProductRouteSourceProduct => ({
  id,
  variants: [
    { id: "variant-1", sku: "SKU-AbC-01" },
    { id: "variant-2", sku: "SKU-AbC-02" },
  ],
})

const createRegistry = (
  result: SourceReadResult<UrlRegistryResolution>
): ProductRouteRegistry => ({
  resolve: vi.fn().mockResolvedValue(result),
})

const createSourceReader = (
  result: SourceReadResult<ProductRouteSourceProduct>
) => vi.fn().mockResolvedValue(result)

const resolve = (
  registryResult: SourceReadResult<UrlRegistryResolution>,
  sourceResult: SourceReadResult<ProductRouteSourceProduct>,
  overrides: Partial<Parameters<typeof resolveProductRoute>[0]> = {}
) =>
  resolveProductRoute({
    canonicalizationRequired: false,
    market: "sk",
    normalizedSlug: "current-product",
    rawQuery: "",
    readProductById: createSourceReader(sourceResult),
    registry: createRegistry(registryResult),
    ...overrides,
  })

describe("resolveProductRoute", () => {
  it("returns the canonical product and resolves an exact variant SKU to its Medusa ID", async () => {
    const result = await resolve(
      { kind: "found", value: currentResolution() },
      { kind: "found", value: sourceProduct() },
      { rawQuery: "variant=SKU-AbC-01" }
    )

    expect(result).toEqual({
      kind: "found",
      value: {
        canonicalUrl: "https://herbatica.sk/produkty/current-product",
        initialVariantId: "variant-1",
        product: sourceProduct(),
        publicSlug: "current-product",
      },
    })
  })

  it("redirects directly to the current canonical URL when the trusted proxy requires canonicalization", async () => {
    const result = await resolve(
      { kind: "found", value: currentResolution() },
      { kind: "found", value: sourceProduct() },
      { canonicalizationRequired: true }
    )

    expect(result).toEqual({
      kind: "redirect",
      destination: "https://herbatica.sk/produkty/current-product",
      statusCode: 308,
    })
  })

  it("composes an alias and noncanonical query into one direct 308", async () => {
    const currentRoute = route("prod-1")
    const resolution: UrlRegistryResolution = {
      disposition: "alias",
      route: currentRoute,
      matchedSlug: slug("old-product", currentRoute.id, "alias"),
      currentSlug: slug("current-product", currentRoute.id, "current"),
    }
    const readProductById = createSourceReader({
      kind: "found",
      value: sourceProduct(),
    })

    const result = await resolveProductRoute({
      canonicalizationRequired: false,
      market: "sk",
      normalizedSlug: "old-product",
      rawQuery: "utm_source=test&variant=SKU-AbC-01&unknown=drop",
      readProductById,
      registry: createRegistry({ kind: "found", value: resolution }),
    })

    expect(readProductById).toHaveBeenCalledWith({
      market: "sk",
      productId: "prod-1",
      publicSlug: "current-product",
    })
    expect(result).toEqual({
      kind: "redirect",
      destination:
        "https://herbatica.sk/produkty/current-product?variant=SKU-AbC-01&utm_source=test",
      statusCode: 308,
    })
  })

  it("returns 404 for an unknown or foreign variant", async () => {
    const result = await resolve(
      { kind: "found", value: currentResolution() },
      { kind: "found", value: sourceProduct() },
      { rawQuery: "variant=SKU-foreign" }
    )

    expect(result).toEqual({ kind: "not-found" })
  })

  it("accepts an exact Medusa variant ID and preserves case-sensitive matching", async () => {
    const byId = await resolve(
      { kind: "found", value: currentResolution() },
      { kind: "found", value: sourceProduct() },
      { rawQuery: "variant=variant-2" }
    )
    const wrongCaseSku = await resolve(
      { kind: "found", value: currentResolution() },
      { kind: "found", value: sourceProduct() },
      { rawQuery: "variant=sku-abc-01" }
    )

    expect(byId).toEqual({
      kind: "found",
      value: expect.objectContaining({ initialVariantId: "variant-2" }),
    })
    expect(wrongCaseSku).toEqual({ kind: "not-found" })
  })

  it("maps duplicate matching variant keys to 503", async () => {
    const product: ProductRouteSourceProduct = {
      id: "prod-1",
      variants: [
        { id: "variant-1", sku: "SKU-duplicate" },
        { id: "variant-2", sku: "SKU-duplicate" },
      ],
    }

    const result = await resolve(
      { kind: "found", value: currentResolution() },
      { kind: "found", value: product },
      { rawQuery: "variant=SKU-duplicate" }
    )

    expect(result).toEqual({ kind: "unavailable" })
  })

  it("uses the successor stable ID and redirects directly to its current slug", async () => {
    const previousRoute = route("prod-old", {
      id: "route-old",
      status: "superseded",
      successorRouteId: "route-new",
    })
    const successorRoute = route("prod-new", { id: "route-new" })
    const resolution: UrlRegistryResolution = {
      disposition: "superseded",
      route: previousRoute,
      matchedSlug: slug("previous-product", previousRoute.id, "current"),
      successorRoute,
      currentSlug: slug("successor-product", successorRoute.id, "current"),
    }
    const readProductById = createSourceReader({
      kind: "found",
      value: sourceProduct("prod-new"),
    })

    const result = await resolveProductRoute({
      canonicalizationRequired: false,
      market: "sk",
      normalizedSlug: "previous-product",
      rawQuery: "",
      readProductById,
      registry: createRegistry({ kind: "found", value: resolution }),
    })

    expect(readProductById).toHaveBeenCalledWith({
      market: "sk",
      productId: "prod-new",
      publicSlug: "successor-product",
    })
    expect(result).toEqual({
      kind: "redirect",
      destination: "https://herbatica.sk/produkty/successor-product",
      statusCode: 308,
    })
  })

  it("maps missing and gone registry entries without reading Medusa", async () => {
    const missingReader = createSourceReader({ kind: "missing" })
    const missing = await resolveProductRoute({
      canonicalizationRequired: false,
      market: "sk",
      normalizedSlug: "missing-product",
      rawQuery: "",
      readProductById: missingReader,
      registry: createRegistry({ kind: "missing" }),
    })
    const goneReader = createSourceReader({ kind: "missing" })
    const gone = await resolveProductRoute({
      canonicalizationRequired: false,
      market: "sk",
      normalizedSlug: "retired-product",
      rawQuery: "",
      readProductById: goneReader,
      registry: createRegistry({
        kind: "found",
        value: {
          disposition: "gone",
          route: route("prod-retired", { status: "retired" }),
          matchedSlug: slug("retired-product", "route-prod-retired", "alias"),
        },
      }),
    })

    expect(missing).toEqual({ kind: "not-found" })
    expect(gone).toEqual({ kind: "gone" })
    expect(missingReader).not.toHaveBeenCalled()
    expect(goneReader).not.toHaveBeenCalled()
  })

  it.each([
    [{ kind: "unavailable", retryAfterSeconds: 12 }, 12],
    [{ kind: "invalid-response", causeCode: "bad-row" }, undefined],
  ] as const)("maps registry source failure %o to 503", async (registryResult, retryAfterSeconds) => {
    const result = await resolve(registryResult, {
      kind: "found",
      value: sourceProduct(),
    })

    expect(result).toEqual({
      kind: "unavailable",
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    })
  })

  it.each([
    [{ kind: "missing" }, { kind: "not-found" }],
    [
      { kind: "unavailable", retryAfterSeconds: 9 },
      { kind: "unavailable", retryAfterSeconds: 9 },
    ],
    [
      { kind: "invalid-response", causeCode: "bad-product" },
      { kind: "unavailable" },
    ],
  ] as const)("maps Medusa source result %o", async (sourceResult, expected) => {
    const result = await resolve(
      { kind: "found", value: currentResolution() },
      sourceResult
    )

    expect(result).toEqual(expected)
  })

  it("fails closed when URLR identity and Medusa payload disagree", async () => {
    const wrongIdentity = await resolve(
      {
        kind: "found",
        value: currentResolution("prod-1", "current-product"),
      },
      { kind: "found", value: sourceProduct("prod-other") }
    )
    const payloadRoute = route("prod-1", { sourceSystem: "payload" })
    const payloadSlug = slug("current-product", payloadRoute.id, "current")
    const wrongSource = await resolve(
      {
        kind: "found",
        value: {
          disposition: "current",
          route: payloadRoute,
          matchedSlug: payloadSlug,
          currentSlug: payloadSlug,
        },
      },
      { kind: "found", value: sourceProduct() }
    )

    expect(wrongIdentity).toEqual({ kind: "unavailable" })
    expect(wrongSource).toEqual({ kind: "unavailable" })
  })

  it.each([
    ["cross-market", route("prod-1", { market: "cz" })],
    ["inactive", route("prod-1", { status: "retired" })],
  ] as const)("fails closed for a %s current URLR projection", async (_label, invalidRoute) => {
    const currentSlug = slug("current-product", invalidRoute.id, "current")
    const readProductById = createSourceReader({
      kind: "found",
      value: sourceProduct(),
    })

    const result = await resolve(
      {
        kind: "found",
        value: {
          disposition: "current",
          route: invalidRoute,
          matchedSlug: currentSlug,
          currentSlug,
        },
      },
      { kind: "found", value: sourceProduct() },
      { readProductById }
    )

    expect(result).toEqual({ kind: "unavailable" })
    expect(readProductById).not.toHaveBeenCalled()
  })

  it("maps a malformed variant payload to 503 instead of throwing", async () => {
    const malformedProduct = {
      ...sourceProduct(),
      variants: [null],
    } as unknown as ProductRouteSourceProduct

    const result = await resolve(
      { kind: "found", value: currentResolution() },
      { kind: "found", value: malformedProduct },
      { rawQuery: "variant=variant-1" }
    )

    expect(result).toEqual({ kind: "unavailable" })
  })
})
