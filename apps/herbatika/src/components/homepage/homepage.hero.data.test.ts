import { describe, expect, it, vi } from "vitest"
import { parsePublicPath } from "@/lib/url/public-route-api"
import type { HeroBannerItem } from "./homepage.data.types"
import {
  CZ_HERO_BANNERS,
  HERO_BANNERS,
  HU_HERO_BANNERS,
  RO_HERO_BANNERS,
  resolveHomepageHeroBanners,
  resolveHomepageHeroSource,
} from "./homepage.hero.data"

const SLOVAK_CANARY =
  /rýchle|doručenie|dodanie|otvárame|prevádzku|čistejšie|akčné|vypredania|vašich|novinky|pravidelne|dopĺňame|kozmetika/iu
const UNSAFE_MARKETING_CLAIM_CANARY =
  /24\s*(?:h|hod|óra|ore)|sănătos|zdraví|egészség/iu

describe("resolveHomepageHeroBanners", () => {
  it.each([
    ["cz", CZ_HERO_BANNERS, "Objevte sortiment Herbatica"],
    ["hu", HU_HERO_BANNERS, "Fedezze fel a Herbatica kínálatát"],
    ["ro", RO_HERO_BANNERS, "Descoperă gama Herbatica"],
  ] as const)("uses a complete safe %s fallback when CMS is empty", (market, expected, headline) => {
    const result = resolveHomepageHeroBanners([], market)
    const copy = result
      .flatMap(({ badge, imageAlt, subtitle, title }) => [
        badge,
        imageAlt,
        subtitle,
        title,
      ])
      .filter(Boolean)
      .join(" ")

    expect(result).toBe(expected)
    expect(result).toHaveLength(8)
    expect(
      result.every(
        ({ ctaLabel, ctaTarget, imageAlt, title }) =>
          ctaLabel && ctaTarget && imageAlt && title
      )
    ).toBe(true)
    expect(copy).toContain(headline)
    expect(copy).not.toMatch(SLOVAK_CANARY)
    expect(copy).not.toMatch(UNSAFE_MARKETING_CLAIM_CANARY)
    for (const banner of result) {
      expect(banner.ctaTarget?.kind).toBe("static")
      if (banner.ctaTarget?.kind !== "static") {
        throw new Error("Expected a route-registry CTA")
      }
      expect(
        parsePublicPath({
          market,
          pathname: banner.ctaTarget.href,
          rawQuery: "",
        }).kind
      ).toBe("found")
    }
  })

  it("preserves the existing Slovak fallback", () => {
    expect(resolveHomepageHeroBanners(undefined, "sk")).toBe(HERO_BANNERS)
    expect(HERO_BANNERS[0]?.title).toBe("Rýchle doručenie 24h!")
  })

  it("prefers non-empty locale-scoped CMS banners", () => {
    const cmsBanners: HeroBannerItem[] = [
      {
        id: "cms-ro",
        imageSrc: "/cms-ro.avif",
        title: "Conținut editorial românesc",
      },
    ]

    expect(resolveHomepageHeroBanners(cmsBanners, "ro")).toBe(cmsBanners)
  })
})

describe("resolveHomepageHeroSource", () => {
  it.each([
    "cz",
    "hu",
    "ro",
  ] as const)("fails closed for %s without CMS or a reviewed manifest", (market) => {
    expect(resolveHomepageHeroSource([], market)).toEqual({
      kind: "unavailable",
    })
  })

  it("uses exact reviewed data for a market without a bundled fallback", () => {
    const reviewed: HeroBannerItem[] = [
      {
        id: "reviewed-cz",
        imageAlt: "Schválený testovací obrázek",
        imageSrc: "/reviewed-cz.avif",
      },
    ]

    expect(resolveHomepageHeroSource([], "cz", () => reviewed)).toEqual({
      kind: "found",
      value: reviewed,
    })
  })

  it("preserves CMS precedence and the existing reviewed SK source", () => {
    const cms: HeroBannerItem[] = [{ id: "cms", imageSrc: "/cms.avif" }]
    const readReviewed = vi.fn(() => [
      { id: "must-not-be-read", imageSrc: "/must-not-be-read.avif" },
    ])

    expect(resolveHomepageHeroSource(cms, "cz", readReviewed)).toEqual({
      kind: "found",
      value: cms,
    })
    expect(resolveHomepageHeroSource([], "sk", readReviewed)).toEqual({
      kind: "found",
      value: HERO_BANNERS,
    })
    expect(readReviewed).not.toHaveBeenCalled()
  })

  it("never treats localized marketing fallbacks as publication-ready", () => {
    const readReviewed = vi.fn(
      function missingReviewedRomanianSource(): undefined {
        return
      }
    )

    for (const market of ["cz", "hu", "ro"] as const) {
      expect(resolveHomepageHeroBanners([], market)).toHaveLength(8)
      expect(resolveHomepageHeroSource([], market, readReviewed)).toEqual({
        kind: "unavailable",
      })
    }
    expect(readReviewed).toHaveBeenCalledTimes(3)
  })

  it.each([
    ["sk", "found"],
    ["cz", "unavailable"],
    ["hu", "unavailable"],
    ["ro", "unavailable"],
  ] as const)("applies the four-market publication contract for %s", (market, expectedKind) => {
    expect(resolveHomepageHeroSource([], market).kind).toBe(expectedKind)
  })
})
