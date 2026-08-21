import { describe, expect, it, vi } from "vitest"
import type { HeroBannerItem } from "./homepage.data.types"
import {
  HERO_BANNERS,
  RO_HERO_BANNERS,
  resolveHomepageHeroBanners,
  resolveHomepageHeroSource,
} from "./homepage.hero.data"

const SLOVAK_CANARY =
  /rýchle|doručenie|dodanie|otvárame|prevádzku|domácnosť|čistejšie|akčné|vypredania|vyberte|darčeky|pripravené|vašich|novinky|pravidelne|dopĺňame|kozmetika/iu

describe("resolveHomepageHeroBanners", () => {
  it("uses the complete Romanian demo fallback when Romanian CMS is empty", () => {
    const result = resolveHomepageHeroBanners([], "ro")
    const copy = result
      .flatMap(({ badge, imageAlt, subtitle, title }) => [
        badge,
        imageAlt,
        subtitle,
        title,
      ])
      .filter(Boolean)
      .join(" ")

    expect(result).toBe(RO_HERO_BANNERS)
    expect(result).toHaveLength(8)
    expect(result.every(({ imageAlt, title }) => imageAlt && title)).toBe(true)
    expect(copy).toContain("Livrare rapidă în 24 de ore!")
    expect(copy).toContain("Livrare în România")
    expect(copy).not.toMatch(SLOVAK_CANARY)
    expect(result.map(({ id }) => id)).not.toContain("black-friday")
    expect(result.map(({ id }) => id)).not.toContain("nova-prevadzka")
  })

  it("preserves the existing Slovak fallback", () => {
    expect(resolveHomepageHeroBanners(undefined, "sk")).toBe(HERO_BANNERS)
    expect(HERO_BANNERS[0]?.title).toBe("Rýchle doručenie 24h!")
  })

  it("does not silently reuse Slovak copy for markets without a fallback", () => {
    expect(resolveHomepageHeroBanners([], "cz")).toEqual([])
    expect(resolveHomepageHeroBanners(undefined, "hu")).toEqual([])
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

  it("preserves CMS precedence and the existing SK/RO fallbacks", () => {
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
    expect(resolveHomepageHeroSource([], "ro", readReviewed)).toEqual({
      kind: "found",
      value: RO_HERO_BANNERS,
    })
    expect(readReviewed).not.toHaveBeenCalled()
  })
})
