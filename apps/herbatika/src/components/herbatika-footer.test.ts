import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  resolveFooterNavigationItem,
  resolveFooterSocialLinks,
} from "./herbatika-footer"
import { resolveFooterMarketLinks } from "./herbatika-footer.market-links"

const footerSource = readFileSync(
  resolve(process.cwd(), "src/components/herbatika-footer.tsx"),
  "utf8"
)
const appShellSource = readFileSync(
  resolve(process.cwd(), "src/components/app-shell.tsx"),
  "utf8"
)
const pagesAppSource = readFileSync(
  resolve(process.cwd(), "src/pages/_app.tsx"),
  "utf8"
)

describe("HerbatikaFooter contact localization", () => {
  it("renders contact actions only through the verified authority hook", () => {
    expect(footerSource).toContain("useOperatorContact()")
    expect(footerSource).toContain("operatorContact.available")
    expect(footerSource).toContain("href={operatorContact.phoneHref}")
    expect(footerSource).toContain("{operatorContact.phoneDisplay}")
    expect(footerSource).toContain("{operatorContact.hours}")
    expect(footerSource).toContain("href={operatorContact.emailHref}")
    expect(footerSource).toContain("{operatorContact.emailDisplay}")
    expect(footerSource).toContain("{operatorContact.unavailable}")
  })

  it("does not embed a market-specific phone, schedule, or email", () => {
    for (const marketSpecificCopy of [
      "tel:+421",
      "+421 2/321",
      "Po-Pia",
      "mailto:ahoj@herbatica.sk",
      "tel:+40",
      "+40 (31)",
      "Lun–Vin",
      "mailto:salut@herbatica.ro",
    ]) {
      expect(footerSource).not.toContain(marketSpecificCopy)
    }
  })
})

describe("HerbatikaFooter market links", () => {
  const configuredAlternates = {
    "cs-CZ": "https://cz.shop.example/produkty/zeleny-caj",
    "hu-HU": "https://hu.shop.example/termekek/zold-tea",
    "ro-RO": "https://ro.shop.example/produse/ceai-verde",
    "sk-SK": "https://sk.shop.example/produkty/zeleny-caj",
  }

  const expectedLinks = [
    {
      code: "SK",
      href: "https://sk.shop.example/produkty/zeleny-caj",
      icon: "token-icon-sk",
      market: "sk",
    },
    {
      code: "CZ",
      href: "https://cz.shop.example/produkty/zeleny-caj",
      icon: "token-icon-cz",
      market: "cz",
    },
    {
      code: "HU",
      href: "https://hu.shop.example/termekek/zold-tea",
      icon: "token-icon-hu",
      market: "hu",
    },
    {
      code: "RO",
      href: "https://ro.shop.example/produse/ceai-verde",
      icon: "token-icon-ro",
      market: "ro",
    },
  ] as const

  it.each([
    "sk",
    "cz",
    "hu",
    "ro",
  ] as const)("marks only %s active and preserves every configured market alternate", (activeMarket) => {
    expect(
      resolveFooterMarketLinks(activeMarket, configuredAlternates)
    ).toEqual(
      expectedLinks.map((link) => ({
        active: link.market === activeMarket,
        ...link,
      }))
    )
  })

  it("omits unavailable or unsafe markets instead of guessing a domain", () => {
    expect(
      resolveFooterMarketLinks("sk", {
        "cs-CZ": "https://user:secret@cz.shop.example/",
        "ro-RO": "http://ro.shop.example/produse",
        "sk-SK": "https://sk.shop.example/#untrusted-fragment",
      })
    ).toEqual([])
  })

  it("renders navigable link buttons from the trusted market links", () => {
    expect(pagesAppSource).toContain(
      "marketAlternates={pageProps.seo?.alternates}"
    )
    expect(appShellSource).toContain("marketAlternates={marketAlternates}")
    expect(footerSource).toContain("resolveFooterMarketLinks(")
    expect(footerSource).toContain("<LinkButton")
    expect(footerSource).toContain("href={link.href}")
    expect(footerSource).toContain(
      'aria-current={link.active ? "page" : undefined}'
    )
  })
})

describe("HerbatikaFooter social links", () => {
  it("preserves generic profiles and Slovak-specific profiles on SK", () => {
    expect(resolveFooterSocialLinks("sk").map((link) => link.label)).toEqual([
      "Facebook",
      "Instagram",
      "YouTube",
      "LinkedIn",
      "TikTok",
    ])
  })

  it.each([
    "cz",
    "hu",
    "ro",
  ] as const)("hides every social action without %s market authority", (market) => {
    expect(resolveFooterSocialLinks(market)).toEqual([])
  })

  it("renders only the exact reviewed market profiles", () => {
    expect(
      resolveFooterSocialLinks("cz", "reviewed", [
        {
          href: "https://www.instagram.com/herbatica.cz",
          platform: "instagram",
        },
      ])
    ).toEqual([
      {
        href: "https://www.instagram.com/herbatica.cz",
        icon: "token-icon-instagram",
        label: "Instagram",
      },
    ])
  })

  it("renders social destinations as links instead of window actions", () => {
    expect(footerSource).toContain("resolveFooterSocialLinks(")
    expect(footerSource).toContain("href={social.href}")
    expect(footerSource).not.toContain("window.open(social.href")
  })
})

describe("resolveFooterNavigationItem", () => {
  it("accepts a valid internal path for the active market", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/informacie/about-herbatica",
          slot: "about",
          type: "internal",
        },
        "sk"
      )
    ).toEqual({
      href: "/informacie/about-herbatica",
      kind: "internal",
    })
  })

  it("supports application routes independently of their translation slot", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/kategorie/darceky",
          slot: "gift_voucher",
          type: "internal",
        },
        "sk"
      )
    ).toEqual({ href: "/kategorie/darceky", kind: "internal" })
  })

  it("fails closed for an unknown internal route", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "/legacy-or-editor-authored-path",
          slot: "about",
          type: "internal",
        },
        "sk"
      )
    ).toBeNull()
  })

  it.each([
    "javascript:alert(1)",
    "//example.com/reviews",
    "https://user:secret@example.com/reviews",
  ])("rejects unsafe external CMS href %s", (href) => {
    expect(
      resolveFooterNavigationItem(
        {
          href,
          slot: "reviews",
          type: "external",
        },
        "sk"
      )
    ).toBeNull()
  })

  it("accepts an explicit HTTP(S) external URL and preserves tab intent", () => {
    expect(
      resolveFooterNavigationItem(
        {
          href: "https://example.com/reviews",
          newTab: false,
          slot: "reviews",
          type: "external",
        },
        "sk"
      )
    ).toEqual({
      href: "https://example.com/reviews",
      kind: "external",
      newTab: false,
    })
  })
})
