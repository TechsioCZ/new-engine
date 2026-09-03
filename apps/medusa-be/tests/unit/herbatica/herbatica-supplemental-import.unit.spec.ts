import { describe, expect, it } from "vitest"
import {
  buildProductPublicationMetadata,
  buildSupplementalCategoryInput,
  buildSupplementalProductInput,
  HERBATICA_MARKET_CONFIG,
  HERBATICA_SUPPLEMENTAL_MANIFEST_SHA256,
  parseHerbaticaSupplementalManifest,
  supplementalCategoryHandle,
} from "../../../src/scripts/herbatica-supplemental-import/manifest"
import { assertSupplementalIdentityState } from "../../../src/scripts/herbatica-supplemental-import/preflight"

const TEST_SHA = "a".repeat(64)

const manifestInput = () => ({
  captured_at: "2026-08-21T12:00:00Z",
  categories: [
    {
      handle: "zvierata",
      name: "Zvieratá",
      parent_handle: null,
      source_path: "Zvieratá",
    },
  ],
  products: [
    {
      brand: "Customer Brand",
      category_handle: "zvierata",
      category_path: "Zvieratá",
      code: "7650",
      customer_ean: "1234567890123",
      ean: "1234567890123",
      external_id: "herbatica-sk-shopitem-26500",
      images: ["https://cdn.myshoptet.com/usr/example/shop/orig/product.jpg"],
      localized: {
        sk: {
          description: "SK description",
          public_slug: "customer--slug-",
          short_description: "SK short",
          source_url: "https://www.herbatica.sk/customer--slug-/",
          title: "SK title",
        },
        cz: {
          description: "CZ description",
          public_slug: "customer---slug-cz",
          short_description: "CZ short",
          source_url: "https://www.herbatica.cz/customer---slug-cz/",
          title: "CZ title",
        },
        hu: {
          description: "HU description",
          public_slug: "customer-slug-hu",
          short_description: "HU short",
          source_url: "https://www.herbatica.hu/customer-slug-hu/",
          title: "HU title",
        },
        ro: {
          description: "RO description",
          public_slug: "customer-slug-ro",
          short_description: "RO short",
          source_url: "https://www.herbatica.ro/customer-slug-ro/",
          title: "RO title",
        },
      },
      prices: { czk: 299, eur: 11.9, huf: 4590, ron: 59 },
      published_markets: ["sk", "cz", "hu", "ro"],
      source_guid: "source-guid",
      source_shopitem_id: "26500",
      stock_quantity: 4,
      vat: 23,
    },
  ],
  schema_version: 1,
  sha256: TEST_SHA,
  source: "customer-authorized live Herbatica SK/CZ/HU/RO product pages",
})

const parseTestManifest = (input: unknown = manifestInput()) =>
  parseHerbaticaSupplementalManifest(input, {
    expectedCategoryCount: 1,
    expectedProductCount: 1,
    expectedSha256: TEST_SHA,
  })

describe("Herbatika supplemental manifest", () => {
  it("preserves exact customer slugs and builds one shared market-priced product", () => {
    const manifest = parseTestManifest()
    const source = manifest.products[0]
    const product = buildSupplementalProductInput(manifest)[0]

    expect(source?.localized.sk?.public_slug).toBe("customer--slug-")
    expect(buildSupplementalCategoryInput(manifest)).toEqual([])
    expect(product).toMatchObject({
      categories: [{ handle: "veterinarna-starostlivost" }],
      external_id: "26500",
      handle: "shopitem-26500",
      salesChannelNames: [
        "Default Sales Channel",
        ...Object.values(HERBATICA_MARKET_CONFIG).map(
          ({ salesChannelName }) => salesChannelName
        ),
      ],
      variants: [
        {
          ean: "1234567890123",
          sku: "SHOPITEM-26500-26500",
        },
      ],
    })
    expect(product?.variants[0]?.prices).toEqual(
      expect.arrayContaining([
        { amount: 11.9, currency_code: "eur" },
        { amount: 299, currency_code: "czk" },
        { amount: 4590, currency_code: "huf" },
        { amount: 59, currency_code: "ron" },
      ])
    )
  })

  it.each([
    ["zvierata", "veterinarna-starostlivost"],
    ["zvierata-psy", "veterinarna-starostlivost-psy"],
    ["zvierata-macky", "veterinarna-starostlivost-macky"],
    [
      "prirodna-kozmetika-telova-kozmetika-repelenty",
      "prirodna-kozmetika-telova-kozmetika-repelenty-ochrana-pred-hmyzom",
    ],
    [
      "prirodna-kozmetika-telova-kozmetika-starostlivost-o-nohy",
      "prirodna-kozmetika-pletova-kozmetika-starostlivost-o-nohy",
    ],
  ])("maps supplemental category %s to %s", (source, target) => {
    expect(supplementalCategoryHandle(source)).toBe(target)
  })

  it("keeps a customer-absent CZ product out of CZ price, channel, and publication", () => {
    const input = manifestInput()
    Reflect.deleteProperty(input.products[0].localized, "cz")
    Reflect.deleteProperty(input.products[0].prices, "czk")
    input.products[0].published_markets = ["sk", "hu", "ro"]
    const manifest = parseTestManifest(input)
    const source = manifest.products[0]
    if (!source) {
      throw new Error("Parsed manifest lost its product")
    }
    const product = buildSupplementalProductInput(manifest)[0]
    const publication = buildProductPublicationMetadata(source, {
      sk: "sc_sk",
      cz: "sc_cz",
      hu: "sc_hu",
      ro: "sc_ro",
    })

    expect(product?.salesChannelNames).not.toContain(
      HERBATICA_MARKET_CONFIG.cz.salesChannelName
    )
    expect(product?.variants[0]?.prices).not.toContainEqual(
      expect.objectContaining({ currency_code: "czk" })
    )
    expect(publication.markets).not.toHaveProperty("cz")
  })

  it("enforces approved hash and exact production counts by default", () => {
    const input = manifestInput()
    input.sha256 = HERBATICA_SUPPLEMENTAL_MANIFEST_SHA256

    expect(() => parseHerbaticaSupplementalManifest(input)).toThrow(
      "manifest must contain 5 supplemental categories"
    )
  })

  it.each([
    [
      "wrong external ID",
      (input: ReturnType<typeof manifestInput>) => {
        input.products[0].external_id = "other"
      },
      "products[0].external_id is invalid",
    ],
    [
      "wrong market host",
      (input: ReturnType<typeof manifestInput>) => {
        input.products[0].localized.ro.source_url =
          "https://www.herbatica.sk/customer-slug-ro/"
      },
      "products[0].localized.ro.source_url is invalid",
    ],
    [
      "slug URL drift",
      (input: ReturnType<typeof manifestInput>) => {
        input.products[0].localized.hu.public_slug = "different"
      },
      "products[0].localized.hu.public_slug differs from source_url",
    ],
    [
      "currency drift",
      (input: ReturnType<typeof manifestInput>) => {
        Reflect.deleteProperty(input.products[0].prices, "ron")
      },
      "products[0].prices fields are invalid",
    ],
  ])("rejects %s", (_name, mutate, message) => {
    const input = manifestInput()
    mutate(input)
    expect(() => parseTestManifest(input)).toThrow(message)
  })
})

describe("Herbatika supplemental identity preflight", () => {
  const manifest = parseTestManifest()
  const persistedProduct = {
    externalId: "26500",
    handle: "shopitem-26500",
    id: "prod_existing",
    variants: [{ ean: "1234567890123", sku: "SHOPITEM-26500-26500" }],
  }
  const persistedVariant = {
    ean: "1234567890123",
    id: "variant_existing",
    productId: "prod_existing",
    sku: "SHOPITEM-26500-26500",
  }

  it("accepts an exact idempotent rerun", () => {
    expect(() =>
      assertSupplementalIdentityState({
        manifest,
        products: [persistedProduct],
        variants: [persistedVariant],
      })
    ).not.toThrow()
  })

  it.each([
    ["EAN", { ...persistedVariant, productId: "prod_unrelated", sku: null }],
    ["SKU", { ...persistedVariant, productId: "prod_unrelated", ean: null }],
  ])("fails closed on unrelated %s ownership", (kind, owner) => {
    expect(() =>
      assertSupplementalIdentityState({
        manifest,
        products: [],
        variants: [owner],
      })
    ).toThrow(`${kind} collision`)
  })

  it("fails closed when stable handle belongs to another external identity", () => {
    expect(() =>
      assertSupplementalIdentityState({
        manifest,
        products: [{ ...persistedProduct, externalId: "99999" }],
        variants: [],
      })
    ).toThrow("Handle collision")
  })
})
