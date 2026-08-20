import { describe, expect, it } from "vitest"
import type { ProductRouteMedusaProduct } from "@/lib/storefront/product-route-source"
import { buildProductSeo, serializeProductJsonLd } from "./product"

const product = {
  id: "prod-1",
  title: "Herbal Tea </script>",
  handle: "legacy-handle",
  description: "<p>Long fallback description</p>",
  thumbnail: "https://cdn.example.test/tea-cover.jpg",
  images: [
    { url: "https://cdn.example.test/tea-cover.jpg" },
    { url: "https://cdn.example.test/tea-side.jpg" },
    { url: "javascript:alert(1)" },
  ],
  metadata: {
    short_description: "<p>Fresh&nbsp; herbal tea.</p>",
  },
  brand: { title: "Herbatica Labs" },
  variants: [
    {
      id: "variant-1",
      sku: "SKU-ONE",
      ean: "4006381333931",
      manage_inventory: true,
      inventory_quantity: 0,
      calculated_price: {
        calculated_amount: 12.5,
        currency_code: "eur",
      },
    },
    {
      id: "variant-2",
      sku: "SKU-TWO",
      allow_backorder: true,
      calculated_price: {
        calculated_amount: 9.99,
        currency_code: "eur",
      },
    },
  ],
} as unknown as ProductRouteMedusaProduct

describe("buildProductSeo", () => {
  it("uses one canonical URL for metadata, Open Graph, and Product JSON-LD", () => {
    const seo = buildProductSeo({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      initialVariantId: "variant-2",
      product,
    })

    expect(seo).toEqual({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      description: "Fresh herbal tea.",
      images: [
        "https://cdn.example.test/tea-cover.jpg",
        "https://cdn.example.test/tea-side.jpg",
      ],
      jsonLd: {
        "@context": "https://schema.org",
        "@id": "https://herbatica.sk/produkty/herbal-tea",
        "@type": "Product",
        brand: { "@type": "Brand", name: "Herbatica Labs" },
        description: "Fresh herbal tea.",
        image: [
          "https://cdn.example.test/tea-cover.jpg",
          "https://cdn.example.test/tea-side.jpg",
        ],
        name: "Herbal Tea </script>",
        offers: {
          "@type": "Offer",
          availability: "https://schema.org/InStock",
          price: "9.99",
          priceCurrency: "EUR",
          url: "https://herbatica.sk/produkty/herbal-tea",
        },
        sku: "SKU-TWO",
        url: "https://herbatica.sk/produkty/herbal-tea",
      },
      title: "Herbal Tea </script>",
    })
  })

  it("uses the same inventory policy as the product UI for sold-out offers", () => {
    const seo = buildProductSeo({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      initialVariantId: "variant-1",
      product,
    })

    expect(seo.jsonLd.offers).toMatchObject({
      availability: "https://schema.org/OutOfStock",
      price: "12.5",
    })
    expect(seo.jsonLd).toMatchObject({
      gtin13: "4006381333931",
      sku: "SKU-ONE",
    })
  })

  it("omits an invalid GTIN instead of publishing unverified identifiers", () => {
    const invalidGtinProduct = {
      ...product,
      variants: [{ ...product.variants[0], ean: "1234567890123" }],
    } as unknown as ProductRouteMedusaProduct

    const seo = buildProductSeo({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      product: invalidGtinProduct,
    })

    expect(seo.jsonLd).not.toHaveProperty("gtin13")
  })

  it("falls back to the product description when short copy has no text", () => {
    const seo = buildProductSeo({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      product: {
        ...product,
        metadata: { short_description: "<script>ignored</script>" },
      } as unknown as ProductRouteMedusaProduct,
    })

    expect(seo.description).toBe("Long fallback description")
  })

  it("uses the Romanian description when localized demo rich content is empty", () => {
    const seo = buildProductSeo({
      canonicalUrl:
        "https://herbatica.ro/produse/befungin-tinctura-cu-extract-de-chaga-siberian-100-ml-herbatica",
      product: {
        ...product,
        description: "<p>Descriere oficială în limba română.</p>",
        metadata: {
          content_sections_map: {
            composition: "",
            description: "<p>Descriere oficială în limba română.</p>",
            other: "",
            usage: "",
            warning: "",
          },
          short_description: "",
        },
      } as unknown as ProductRouteMedusaProduct,
    })

    expect(seo.description).toBe("Descriere oficială în limba română.")
    expect(seo.jsonLd.description).toBe("Descriere oficială în limba română.")
    expect(JSON.stringify(seo)).not.toContain("Long fallback description")
  })

  it("ignores malformed optional image payloads", () => {
    const seo = buildProductSeo({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      product: {
        ...product,
        images: [
          null,
          "not-an-image",
          { url: "https://cdn.example.test/good.jpg" },
        ],
        thumbnail: "javascript:alert(1)",
      } as unknown as ProductRouteMedusaProduct,
    })

    expect(seo.images).toEqual(["https://cdn.example.test/good.jpg"])
  })

  it("omits unproven optional fields instead of fabricating data", () => {
    const withoutOptionalFields = {
      ...product,
      brand: undefined,
      description: null,
      images: [],
      metadata: {},
      thumbnail: null,
      variants: [{ id: "variant-no-price", sku: null }],
    } as unknown as ProductRouteMedusaProduct

    const seo = buildProductSeo({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      product: withoutOptionalFields,
    })

    expect(seo.description).toBeNull()
    expect(seo.images).toEqual([])
    expect(seo.jsonLd).not.toHaveProperty("brand")
    expect(seo.jsonLd).not.toHaveProperty("description")
    expect(seo.jsonLd).not.toHaveProperty("image")
    expect(seo.jsonLd).not.toHaveProperty("offers")
    expect(seo.jsonLd).not.toHaveProperty("sku")
  })

  it.each([
    "http://herbatica.sk/produkty/herbal-tea",
    "https://herbatica.sk/produkty/herbal-tea?variant=x",
    "https://herbatica.sk/produkty/herbal-tea#fragment",
  ])("rejects the noncanonical URL %s", (canonicalUrl) => {
    expect(() => buildProductSeo({ canonicalUrl, product })).toThrow(
      "Product SEO URL must be an absolute clean HTTPS URL"
    )
  })
})

describe("serializeProductJsonLd", () => {
  it("escapes script-breaking characters without changing JSON data", () => {
    const seo = buildProductSeo({
      canonicalUrl: "https://herbatica.sk/produkty/herbal-tea",
      product,
    })
    const serialized = serializeProductJsonLd(seo.jsonLd)

    expect(serialized).not.toContain("</script>")
    expect(serialized).toContain("\\u003c/script\\u003e")
    expect(JSON.parse(serialized)).toEqual(seo.jsonLd)
  })
})
