import { describe, expect, it } from "vitest"
import {
  buildPublicOpenGraphLocales,
  buildPublicSeoJsonLd,
  classifySeo,
  serializePublicSeoJsonLd,
} from "./public-seo"

describe("public SEO classification", () => {
  it("indexes a clean listing with reciprocal alternates and sitemap membership", () => {
    expect(
      classifySeo({
        canonicalRawQuery: "",
        routeKind: "product-index",
        values: {},
      })
    ).toEqual({
      alternateEligible: true,
      canonicalRawQuery: "",
      indexable: true,
      sitemapEligible: true,
    })
  })

  it("self-canonicalizes page two without hreflang or sitemap membership", () => {
    expect(
      classifySeo({
        canonicalRawQuery: "page=2",
        routeKind: "category-detail",
        values: { page: 2 },
      })
    ).toEqual({
      alternateEligible: false,
      canonicalRawQuery: "page=2",
      indexable: true,
      sitemapEligible: false,
    })
  })

  it("removes every public SEO signal from facet and sort variants", () => {
    expect(
      classifySeo({
        canonicalRawQuery: "sort=newest&status=sale",
        routeKind: "collection-detail",
        values: { sort: "newest", status: ["sale"] },
      })
    ).toEqual({
      alternateEligible: false,
      canonicalRawQuery: null,
      indexable: false,
      sitemapEligible: false,
    })
  })

  it("keeps product variants on the base product SEO identity", () => {
    expect(
      classifySeo({
        canonicalRawQuery: "variant=SKU-AbC",
        routeKind: "product-detail",
        values: { variant: "SKU-AbC" },
      })
    ).toMatchObject({
      alternateEligible: true,
      canonicalRawQuery: "",
      indexable: true,
      sitemapEligible: true,
    })
  })

  it.each([
    "account-lists",
    "search",
    "account-orders",
  ] as const)("never indexes %s", (routeKind) => {
    expect(
      classifySeo({ canonicalRawQuery: "", routeKind, values: {} })
    ).toMatchObject({ canonicalRawQuery: null, indexable: false })
  })

  it("emits matching canonical JSON-LD only for a public SEO identity", () => {
    expect(
      buildPublicSeoJsonLd({
        canonical: "https://herbatica.sk/blog/spanok",
        inLanguage: "sk-SK",
        schemaType: "Article",
        title: "Spánok < zdravie",
      })
    ).toMatchObject({
      "@id": "https://herbatica.sk/blog/spanok",
      "@type": "Article",
      inLanguage: "sk-SK",
      url: "https://herbatica.sk/blog/spanok",
    })
    expect(buildPublicSeoJsonLd({ title: "Noindex" })).toBeNull()
    expect(
      serializePublicSeoJsonLd({ name: "Spánok < zdravie" })
    ).not.toContain("<")
  })

  it("maps only published Herbatika alternates to Open Graph locales", () => {
    expect(
      buildPublicOpenGraphLocales({
        alternates: {
          "cs-CZ": "https://herbatica.cz/blog/spanek",
          "ro-RO": "https://herbatica.ro/blog/somn",
          "sk-SK": "https://herbatica.sk/blog/spanok",
        },
        locale: "sk-SK",
      })
    ).toEqual({ alternateLocales: ["cs_CZ", "ro_RO"], locale: "sk_SK" })
  })
})
