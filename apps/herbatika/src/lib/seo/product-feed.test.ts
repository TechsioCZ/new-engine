import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it, vi } from "vitest"
import type { MarketRuntimeBinding } from "@/lib/market/market-runtime"
import type { ActiveEntityRouteTarget } from "@/lib/url-registry/model"
import { generateProductFeed } from "./product-feed"

const binding = {
  acceptedHosts: ["herbatica.cz"],
  canonicalOrigin: "https://herbatica.cz",
  countryCode: "CZ",
  locale: "cs-CZ",
  market: "cz",
  publishableApiKey: "pk_cz",
  publishableApiKeyId: "pkid_cz",
  regionId: "reg_cz",
  salesChannelId: "sc_cz",
} as const satisfies MarketRuntimeBinding

const route = {
  currentSlug: {
    createdAt: "2026-08-18T10:00:00.000Z",
    disposition: "current",
    id: "slug_1",
    kind: "product",
    market: "cz",
    normalizationVersion: 1,
    normalizedSlug: "public-slug",
    routeId: "route_1",
  },
  projectionType: "entity",
  route: {
    createdAt: "2026-08-18T10:00:00.000Z",
    equivalenceKey: "product:prod_1",
    id: "route_1",
    indexPolicy: "indexable",
    kind: "product",
    market: "cz",
    sourceId: "prod_1",
    sourceSystem: "medusa",
    sourceType: "product",
    staticRouteKey: null,
    status: "active",
    successorRouteId: null,
    targetType: "entity",
    updatedAt: "2026-08-18T10:00:00.000Z",
    version: 1,
  },
} as const satisfies ActiveEntityRouteTarget

const variant = {
  allow_backorder: false,
  calculated_price: { calculated_amount: 12.5, currency_code: "czk" },
  ean: "123456789",
  id: "variant_1",
  inventory_quantity: 4,
  manage_inventory: true,
  sku: "SKU<&>",
  title: "60 kapslí",
} as HttpTypes.StoreProductVariant

const product = {
  description: "Description & benefits",
  handle: "must-not-appear-in-public-url",
  id: "prod_1",
  metadata: {
    url_registry_publication: {
      markets: {
        cz: {
          publicationStatus: "published",
          publicSlug: "public-slug",
          salesChannelId: "sc_cz",
        },
      },
      schemaVersion: 1,
    },
  },
  thumbnail: "https://cdn.example/image?a=1&b=2",
  title: "Product <name>",
  variants: [variant],
}

describe("product feed", () => {
  it("uses URLR canonical slugs and market-scoped stable ID reads", async () => {
    const dependencies = {
      listProducts: vi
        .fn()
        .mockResolvedValue({ kind: "found", value: [route] }),
      readProducts: vi.fn().mockResolvedValue({ products: [product] }),
      validateProducts: vi.fn().mockResolvedValue({
        kind: "found",
        value: [{ routeId: "route_1" }],
      }),
    }
    const result = await generateProductFeed(binding, dependencies)
    expect(result.kind).toBe("found")
    if (result.kind !== "found") {
      throw new Error("Expected feed")
    }
    expect(result.value).toContain(
      "<URL>https://herbatica.cz/produkty/public-slug</URL>"
    )
    expect(result.value).not.toContain("must-not-appear-in-public-url")
    expect(result.value).toContain("<PRICE_VAT>12.50</PRICE_VAT>")
    expect(result.value).toContain("<AVAILABILITY>in stock</AVAILABILITY>")
    expect(result.value).toContain("Product &lt;name&gt;")
    expect(dependencies.readProducts).toHaveBeenCalledWith({
      market: "cz",
      sources: [
        {
          productId: "prod_1",
          publicSlug: "public-slug",
          routeId: "route_1",
        },
      ],
    })
  })

  it("returns a failure instead of an incomplete feed", async () => {
    const result = await generateProductFeed(binding, {
      listProducts: vi
        .fn()
        .mockResolvedValue({ kind: "found", value: [route] }),
      readProducts: vi.fn().mockResolvedValue({ products: [product] }),
      validateProducts: vi.fn().mockResolvedValue({ kind: "unavailable" }),
    })
    expect(result).toEqual({ kind: "unavailable" })
  })

  it("uses bounded bulk product and proof reads", async () => {
    const routes = Array.from({ length: 205 }, (_, index) => ({
      ...route,
      currentSlug: {
        ...route.currentSlug,
        id: `slug_${index}`,
        normalizedSlug: `product-${index}`,
        routeId: `route_${index}`,
      },
      route: {
        ...route.route,
        equivalenceKey: `product:prod_${index}`,
        id: `route_${index}`,
        sourceId: `prod_${index}`,
      },
    }))
    const readProducts = vi.fn().mockImplementation(({ sources }) =>
      Promise.resolve({
        products: sources.map(
          (source: { productId: string; publicSlug: string }) => ({
            ...product,
            id: source.productId,
            metadata: {
              url_registry_publication: {
                markets: {
                  cz: {
                    publicationStatus: "published",
                    publicSlug: source.publicSlug,
                    salesChannelId: "sc_cz",
                  },
                },
                schemaVersion: 1,
              },
            },
            variants: [],
          })
        ),
      })
    )
    const validateProducts = vi.fn().mockImplementation(({ sources }) =>
      Promise.resolve({
        kind: "found",
        value: sources.map((source: { routeId: string }) => ({
          routeId: source.routeId,
        })),
      })
    )

    await expect(
      generateProductFeed(binding, {
        listProducts: vi
          .fn()
          .mockResolvedValue({ kind: "found", value: routes }),
        readProducts,
        validateProducts,
      })
    ).resolves.toMatchObject({ kind: "found" })

    expect(readProducts).toHaveBeenCalledTimes(3)
    expect(validateProducts).toHaveBeenCalledTimes(3)
    expect(
      readProducts.mock.calls.map(([input]) => input.sources.length)
    ).toEqual([100, 100, 5])
  })
})
