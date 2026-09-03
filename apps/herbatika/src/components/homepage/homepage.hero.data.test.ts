import { describe, expect, it, vi } from "vitest"
import { parsePublicPath } from "@/lib/url/public-route-api"
import type { HeroBannerItem } from "./homepage.data.types"
import {
  CZ_HERO_BANNERS,
  HERO_BANNERS,
  HERO_BANNERS_BY_MARKET,
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
    "sk",
    "cz",
    "hu",
    "ro",
  ] as const)("approves the bundled localized source for %s when CMS is empty", (market) => {
    expect(resolveHomepageHeroSource([], market)).toEqual({
      kind: "found",
      publicationApproved: true,
      value: HERO_BANNERS_BY_MARKET[market],
    })
  })

  it("prefers CMS banners over the bundled source", () => {
    const cms: HeroBannerItem[] = [{ id: "cms", imageSrc: "/cms.avif" }]
    const readReviewed = vi.fn(() => [
      { id: "must-not-be-read", imageSrc: "/must-not-be-read.avif" },
    ])

    expect(resolveHomepageHeroSource(cms, "cz", readReviewed)).toEqual({
      kind: "found",
      publicationApproved: true,
      value: cms,
    })
    expect(resolveHomepageHeroSource([], "sk", readReviewed)).toEqual({
      kind: "found",
      publicationApproved: true,
      value: HERO_BANNERS,
    })
    expect(readReviewed).not.toHaveBeenCalled()
  })

  it("never consults the reviewed-manifest callback for bundled markets", () => {
    const readReviewed = vi.fn(() => {
      throw new Error("invalid review artifact")
    })

    for (const market of ["cz", "hu", "ro"] as const) {
      expect(resolveHomepageHeroBanners([], market)).toHaveLength(8)
      expect(resolveHomepageHeroSource([], market, readReviewed)).toEqual({
        kind: "found",
        publicationApproved: true,
        value: HERO_BANNERS_BY_MARKET[market],
      })
    }
    expect(readReviewed).not.toHaveBeenCalled()
    expect(resolveHomepageHeroSource([], "ro")).toEqual({
      kind: "found",
      publicationApproved: true,
      value: RO_HERO_BANNERS,
    })
  })
})
